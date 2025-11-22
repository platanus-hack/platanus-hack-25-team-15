from typing import List, Tuple, Optional, Set
import logging
import networkx as nx
from sqlalchemy.orm import Session
from sqlalchemy import select

logger = logging.getLogger(__name__)


class MemoryGraphStore:
    """
    In-memory graph of memories with database synchronization.
    Nodes = memory ids
    Edges = similarity relationships (weight = similarity score 0..1)
    
    This class maintains an in-memory NetworkX graph for fast traversal
    while keeping it synchronized with the database for persistence.
    """

    def __init__(self):
        self.graph = nx.Graph()
        self._is_loaded = False

    def load_from_database(self, session: Session):
        """
        Load the entire graph from the database.
        Should be called once during initialization.
        """
        from models import Memory, MemoryEdge
        
        logger.info("Loading graph from database...")
        
        # Load all memory nodes
        memory_ids = session.execute(select(Memory.id)).scalars().all()
        for memory_id in memory_ids:
            self.graph.add_node(memory_id)
        
        # Load all edges
        edges = session.execute(
            select(MemoryEdge.source_id, MemoryEdge.target_id, MemoryEdge.weight)
        ).all()
        
        for source_id, target_id, weight in edges:
            self.graph.add_edge(source_id, target_id, weight=weight)
        
        self._is_loaded = True
        logger.info(f"Graph loaded: {self.graph.number_of_nodes()} nodes, {self.graph.number_of_edges()} edges")

    def add_memory_node(self, memory_id: int):
        """Add a memory node to the graph."""
        self.graph.add_node(memory_id)
        logger.debug(f"Added node: {memory_id}")

    def add_similarity_edge(self, memory_a_id: int, memory_b_id: int, score: float):
        """
        Add a bidirectional similarity edge between two memories.
        """
        self.graph.add_edge(memory_a_id, memory_b_id, weight=score)
        logger.debug(f"Added edge: {memory_a_id} <-> {memory_b_id} (weight={score:.3f})")

    def remove_memory_node(self, memory_id: int):
        """Remove a memory node and all its edges from the graph."""
        if memory_id in self.graph:
            self.graph.remove_node(memory_id)
            logger.debug(f"Removed node: {memory_id}")

    def get_neighbors(self, memory_id: int, limit: int = 5) -> List[Tuple[int, float]]:
        """
        Get the top N most similar neighbors of a memory.
        
        Args:
            memory_id: The memory to find neighbors for
            limit: Maximum number of neighbors to return
            
        Returns:
            List of (neighbor_id, similarity_score) tuples, sorted by score descending
        """
        if memory_id not in self.graph:
            logger.warning(f"Memory {memory_id} not found in graph")
            return []

        neighbors = self.graph[memory_id].items()
        sorted_neighbors = sorted(
            neighbors,
            key=lambda item: item[1].get("weight", 0.0),
            reverse=True,
        )

        return [
            (neighbor_id, data.get("weight", 0.0))
            for neighbor_id, data in sorted_neighbors[:limit]
        ]

    def get_connected_component(self, memory_id: int) -> Set[int]:
        """
        Get all memories in the same connected component as the given memory.
        Useful for finding clusters of related memories.
        """
        if memory_id not in self.graph:
            return set()
        
        # Find the connected component containing this node
        for component in nx.connected_components(self.graph):
            if memory_id in component:
                return component
        
        return {memory_id}

    def get_shortest_path(
        self,
        source_id: int,
        target_id: int,
    ) -> Optional[List[int]]:
        """
        Find the shortest path between two memories in the similarity graph.
        Returns None if no path exists.
        """
        if source_id not in self.graph or target_id not in self.graph:
            return None
        
        try:
            path = nx.shortest_path(self.graph, source_id, target_id)
            return path
        except nx.NetworkXNoPath:
            return None

    def get_graph_stats(self) -> dict:
        """Get statistics about the graph."""
        if not self.graph.number_of_nodes():
            return {
                "nodes": 0,
                "edges": 0,
                "connected_components": 0,
                "average_degree": 0.0,
                "density": 0.0,
            }
        
        return {
            "nodes": self.graph.number_of_nodes(),
            "edges": self.graph.number_of_edges(),
            "connected_components": nx.number_connected_components(self.graph),
            "average_degree": sum(dict(self.graph.degree()).values()) / self.graph.number_of_nodes(),
            "density": nx.density(self.graph),
        }

    def clear(self):
        """Clear the entire graph."""
        self.graph.clear()
        self._is_loaded = False
        logger.info("Graph cleared")
