"""
RAG Memory Service - A production-ready RAG system with graph-based relationships.
Now with chunk-based embeddings for improved semantic search.
"""

from .rag_service import RagMemoryService
from .embeddings import EmbeddingGenerator
from .graph_store import MemoryGraphStore
from .models import Memory, MemoryChunk, MemoryEdge
from .config import RagConfig, config
from .chunking import TextChunker

__all__ = [
    "RagMemoryService",
    "EmbeddingGenerator",
    "MemoryGraphStore",
    "Memory",
    "MemoryChunk",
    "MemoryEdge",
    "RagConfig",
    "config",
    "TextChunker",
]

__version__ = "2.0.0"
