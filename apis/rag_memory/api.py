"""
FastAPI application for RAG Memory Service.
Provides REST API endpoints for memory management and semantic search.
"""
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException, Query, Path
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import logging

from rag_service import RagMemoryService
from models import Memory
from config import config
from openai import OpenAI

# Configure logging
logging.basicConfig(level=getattr(logging, config.log_level))
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="RAG Memory Service API",
    description="API for managing memories with semantic search and graph relationships",
    version="1.0.0",
)

# Configure CORS - completely open
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods
    allow_headers=["*"],  # Allow all headers
)

# Initialize RAG service
rag_service = RagMemoryService()

# Pydantic models for request/response
class MemoryCreate(BaseModel):
    text: str = Field(..., description="The text content of the memory")
    category: Optional[str] = Field(None, description="Optional category for the memory")
    source: Optional[str] = Field(None, description="Optional source identifier")

class MemoryBatchCreate(BaseModel):
    texts: List[str] = Field(..., description="List of text contents")
    categories: Optional[List[str]] = Field(None, description="Optional list of categories")
    sources: Optional[List[str]] = Field(None, description="Optional list of sources")

class MemoryUpdate(BaseModel):
    text: Optional[str] = Field(None, description="New text content")
    category: Optional[str] = Field(None, description="New category")
    source: Optional[str] = Field(None, description="New source")

class MemoryResponse(BaseModel):
    id: int
    text: str
    category: Optional[str]
    source: Optional[str]
    created_at: str

    @classmethod
    def from_memory(cls, memory: Memory) -> "MemoryResponse":
        return cls(
            id=memory.id,
            text=memory.text,
            category=memory.category,
            source=memory.source,
            created_at=memory.created_at.isoformat() if memory.created_at else "",
        )

class SearchResult(BaseModel):
    memory: MemoryResponse
    similarity_score: float

class NeighborResult(BaseModel):
    memory_id: int
    similarity_score: float

class GraphExport(BaseModel):
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]
    metadata: Dict[str, Any]

class ProcessRequest(BaseModel):
    text: str = Field(..., description="User input text, possibly from audio transcription")
    category: Optional[str] = Field(None, description="Optional category hint")
    source: Optional[str] = Field(None, description="Optional source identifier")
    force_action: Optional[str] = Field(
        None,
        description="Optional forced action: 'save' or 'ask'. When set, bypasses intent routing"
    )

def _decide_intent_via_tool_call(text: str) -> str:
    """
    Pure tool-calling: force a single choice between 'save_memory' and 'answer_question'.
    Returns 'save' or 'ask'. Defaults to 'save' on failure.
    """
    try:
        client = OpenAI()
        tools = [
            {
                "type": "function",
                "function": {
                    "name": "save_memory",
                    "description": "Guardar el texto del usuario como una nueva memoria.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "category": {"type": "string"},
                            "source": {"type": "string"},
                        },
                        "required": []
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "answer_question",
                    "description": "Responder a la consulta del usuario usando el RAG.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "needs_citation": {"type": "boolean"}
                        },
                        "required": []
                    }
                }
            }
        ]
        messages = [
            {"role": "system", "content": "Elige exactamente una herramienta: 'save_memory' o 'answer_question'. No respondas directamente."},
            {"role": "user", "content": text},
        ]
        resp = client.chat.completions.create(
            model="gpt-5",
            messages=messages,
            tools=tools,
            tool_choice="required",
            temperature=0.0,
            max_tokens=64,
        )
        tool_calls = getattr(resp.choices[0].message, "tool_calls", None)
        if tool_calls and len(tool_calls) > 0:
            name = tool_calls[0].function.name
            if name == "answer_question":
                return "ask"
            if name == "save_memory":
                return "save"
        return "save"
    except Exception as e:
        logger.warning(f"Tool-calling decision failed: {e}")
        return "save"

def _generate_answer_with_context(query: str, results: List[Any]) -> str:
    """
    Minimal answer generation using OpenAI with retrieved RAG context.
    results: List of (Memory, similarity_score)
    """
    try:
        client = OpenAI()
        context_snippets = []
        for memory, score in results[:3]:
            snippet = memory.text
            if len(snippet) > 600:
                snippet = snippet[:600] + "..."
            context_snippets.append(f"- (sim={score:.2f}) {snippet}")
        context_block = "\n".join(context_snippets) if context_snippets else "No context available."

        system_prompt = (
            "Eres un asistente que responde en español de forma breve y directa.\n"
            "Usa SOLO el contexto proporcionado. Si no hay suficiente contexto, dilo explícitamente y sugiere guardarlo."
        )
        user_prompt = (
            f"Pregunta del usuario:\n{query}\n\n"
            f"Contexto relevante:\n{context_block}\n\n"
            "Responde en 2-4 frases, citando brevemente de dónde sale si aplica."
        )
        resp = client.chat.completions.create(
            model="gpt-5",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.2,
            max_tokens=300,
        )
        return (resp.choices[0].message.content or "").strip()
    except Exception as e:
        logger.error(f"Answer generation failed: {e}")
        return "No pude generar una respuesta con el contexto disponible."

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "rag_memory"}

# Memory CRUD endpoints
@app.post("/memories", response_model=MemoryResponse)
async def create_memory(memory_data: MemoryCreate):
    """Create a new memory."""
    try:
        memory = rag_service.add_memory(
            text=memory_data.text,
            category=memory_data.category,
            source=memory_data.source,
        )
        return MemoryResponse.from_memory(memory)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating memory: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.post("/memories/batch", response_model=List[MemoryResponse])
async def create_memories_batch(batch_data: MemoryBatchCreate):
    """Create multiple memories in batch."""
    try:
        memories = rag_service.add_memories_batch(
            texts=batch_data.texts,
            categories=batch_data.categories,
            sources=batch_data.sources,
        )
        return [MemoryResponse.from_memory(memory) for memory in memories]
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating memories batch: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/memories/{memory_id}", response_model=MemoryResponse)
async def get_memory(memory_id: int = Path(..., description="Memory ID")):
    """Get a memory by ID."""
    try:
        memory = rag_service.get_memory(memory_id)
        if not memory:
            raise HTTPException(status_code=404, detail="Memory not found")
        return MemoryResponse.from_memory(memory)
    except Exception as e:
        logger.error(f"Error getting memory {memory_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.put("/memories/{memory_id}", response_model=MemoryResponse)
async def update_memory(
    memory_id: int = Path(..., description="Memory ID"),
    update_data: MemoryUpdate = None,
):
    """Update a memory."""
    try:
        memory = rag_service.update_memory(
            memory_id=memory_id,
            text=update_data.text,
            category=update_data.category,
            source=update_data.source,
        )
        if not memory:
            raise HTTPException(status_code=404, detail="Memory not found")
        return MemoryResponse.from_memory(memory)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating memory {memory_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.delete("/memories/{memory_id}")
async def delete_memory(memory_id: int = Path(..., description="Memory ID")):
    """Delete a memory."""
    try:
        deleted = rag_service.delete_memory(memory_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Memory not found")
        return {"message": "Memory deleted successfully"}
    except Exception as e:
        logger.error(f"Error deleting memory {memory_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/memories", response_model=List[MemoryResponse])
async def get_all_memories(
    limit: Optional[int] = Query(None, description="Maximum number of memories to return"),
    offset: int = Query(0, description="Number of memories to skip"),
    category: Optional[str] = Query(None, description="Filter by category"),
):
    """Get all memories with optional filtering and pagination."""
    try:
        memories = rag_service.get_all_memories(
            limit=limit,
            offset=offset,
            category=category,
        )
        return [MemoryResponse.from_memory(memory) for memory in memories]
    except Exception as e:
        logger.error(f"Error getting memories: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/memories/count")
async def count_memories(
    category: Optional[str] = Query(None, description="Filter by category")
):
    """Count total number of memories."""
    try:
        count = rag_service.count_memories(category=category)
        return {"count": count}
    except Exception as e:
        logger.error(f"Error counting memories: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

# Search endpoints
@app.get("/search", response_model=List[SearchResult])
async def search_memories(
    query: str = Query(..., description="Search query text"),
    limit: int = Query(5, description="Maximum number of results"),
    category: Optional[str] = Query(None, description="Filter by category"),
    min_similarity: Optional[float] = Query(None, description="Minimum similarity threshold (0.0 to 1.0)"),
):
    """Search for memories similar to the query text."""
    try:
        results = rag_service.search_similar_by_text(
            query_text=query,
            limit=limit,
            category=category,
            min_similarity=min_similarity,
        )
        return [
            SearchResult(
                memory=MemoryResponse.from_memory(memory),
                similarity_score=score,
            )
            for memory, score in results
        ]
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error searching memories: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/search/category/{category}", response_model=List[MemoryResponse])
async def search_by_category(
    category: str = Path(..., description="Category to search for"),
    limit: Optional[int] = Query(None, description="Maximum number of results"),
):
    """Search memories by category."""
    try:
        memories = rag_service.search_by_category(category=category, limit=limit)
        return [MemoryResponse.from_memory(memory) for memory in memories]
    except Exception as e:
        logger.error(f"Error searching by category: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

# Graph endpoints
@app.get("/memories/{memory_id}/neighbors", response_model=List[NeighborResult])
async def get_memory_neighbors(
    memory_id: int = Path(..., description="Memory ID"),
    limit: int = Query(5, description="Maximum number of neighbors"),
):
    """Get the most similar neighbors of a memory."""
    try:
        neighbors = rag_service.get_memory_neighbors(memory_id=memory_id, limit=limit)
        return [
            NeighborResult(memory_id=neighbor_id, similarity_score=score)
            for neighbor_id, score in neighbors
        ]
    except Exception as e:
        logger.error(f"Error getting neighbors for memory {memory_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/memories/{memory_id}/cluster", response_model=List[int])
async def get_memory_cluster(memory_id: int = Path(..., description="Memory ID")):
    """Get all memories in the same cluster as the given memory."""
    try:
        cluster = rag_service.get_memory_cluster(memory_id)
        return cluster
    except Exception as e:
        logger.error(f"Error getting cluster for memory {memory_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/memories/{source_id}/path/{target_id}", response_model=List[MemoryResponse])
async def find_path_between_memories(
    source_id: int = Path(..., description="Source memory ID"),
    target_id: int = Path(..., description="Target memory ID"),
):
    """Find the shortest path between two memories."""
    try:
        path = rag_service.find_path_between_memories(source_id, target_id)
        if not path:
            raise HTTPException(status_code=404, detail="No path found between memories")
        return [MemoryResponse.from_memory(memory) for memory in path]
    except Exception as e:
        logger.error(f"Error finding path between {source_id} and {target_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

# Statistics and export endpoints
@app.get("/statistics")
async def get_graph_statistics():
    """Get statistics about the memory graph."""
    try:
        stats = rag_service.get_graph_statistics()
        return stats
    except Exception as e:
        logger.error(f"Error getting statistics: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/export/graph", response_model=GraphExport)
async def export_graph(
    max_nodes: int = Query(500, description="Maximum number of nodes to include"),
    category: Optional[str] = Query(None, description="Filter by category"),
):
    """Export the memory graph as JSON for visualization."""
    try:
        graph_data = rag_service.export_graph_json(max_nodes=max_nodes, category=category)
        return GraphExport(**graph_data)
    except Exception as e:
        logger.error(f"Error exporting graph: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.post("/rebuild-graph")
async def rebuild_graph():
    """Rebuild the entire in-memory graph from the database."""
    try:
        rag_service.rebuild_graph()
        return {"message": "Graph rebuilt successfully"}
    except Exception as e:
        logger.error(f"Error rebuilding graph: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.post("/process")
async def process_input(request: ProcessRequest):
    """
    Unified endpoint to process user input (text from user or transcribed audio) via pure tool-calling.
    Routes to:
    - save: store as memory
    - ask: perform semantic search and answer with context
    """
    try:
        text = (request.text or "").strip()
        if not text:
            raise HTTPException(status_code=400, detail="Text cannot be empty")

        # Decide intent
        if request.force_action in {"save", "ask"}:
            intent = request.force_action
            decider = "override"
        else:
            intent = _decide_intent_via_tool_call(text)
            decider = "tool_calling"

        if intent == "save":
            memory = rag_service.add_memory(
                text=text,
                category=request.category,
                source=request.source,
            )
            return {
                "action": "saved",
                "intent": "save",
                "decider": decider,
                "memory": MemoryResponse.from_memory(memory),
            }
        else:
            results = rag_service.search_similar_by_text(
                query_text=text,
                limit=5,
                category=request.category,
            )
            answer = _generate_answer_with_context(
                query=text,
                results=results,
            )
            return {
                "action": "answered",
                "intent": "ask",
                "decider": decider,
                "answer": answer,
                "sources": [
                    {
                        "memory": MemoryResponse.from_memory(mem),
                        "similarity_score": score,
                    }
                    for (mem, score) in results
                ],
            }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing input: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
