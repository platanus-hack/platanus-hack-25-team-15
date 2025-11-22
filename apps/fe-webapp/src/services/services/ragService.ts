/**
 * Service for interacting with the RAG Memory API
 */

export interface GraphNode {
  id: string;
  label: string;
  type: string;
  category?: string;
  created_at?: string;
  [key: string]: any;
}

export interface GraphEdge {
  source: string;
  target: string;
  weight: number;
  [key: string]: any;
}

export interface GraphMetadata {
  node_count: number;
  edge_count: number;
  categories?: string[];
  [key: string]: any;
}

export interface GraphExportResponse {
  nodes: GraphNode[];
  edges: GraphEdge[];
  metadata: GraphMetadata;
}

const RAG_API_BASE_URL = process.env.NEXT_PUBLIC_RAG_API_URL || 'http://localhost:8000';

/**
 * Fetch the graph data from the RAG API
 */
export async function fetchGraphData(
  maxNodes: number = 500,
  category?: string
): Promise<GraphExportResponse> {
  const params = new URLSearchParams({
    max_nodes: maxNodes.toString(),
  });

  if (category) {
    params.append('category', category);
  }

  const response = await fetch(`${RAG_API_BASE_URL}/export/graph?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch graph data: ${response.statusText}`);
  }

  const data = await response.json();

  // Convert node IDs to strings for D3
  return {
    nodes: data.nodes.map((node: any) => ({
      ...node,
      id: String(node.id),
      type: 'memory', // Default type
    })),
    edges: data.edges.map((edge: any) => ({
      ...edge,
      source: String(edge.source),
      target: String(edge.target),
    })),
    metadata: {
      ...data.metadata,
      node_count: data.metadata.total_nodes || data.nodes.length,
      edge_count: data.metadata.total_edges || data.edges.length,
    },
  };
}

/**
 * Get graph statistics
 */
export async function fetchGraphStatistics(): Promise<any> {
  const response = await fetch(`${RAG_API_BASE_URL}/statistics`);

  if (!response.ok) {
    throw new Error(`Failed to fetch graph statistics: ${response.statusText}`);
  }

  return response.json();
}