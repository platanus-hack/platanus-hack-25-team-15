from sqlalchemy import Column, Integer, Text, DateTime, Float, ForeignKey, String, Index
from sqlalchemy.sql import func
from pgvector.sqlalchemy import Vector
from database import Base


class Memory(Base):
    """
    Represents a memory with its full text content.
    Text is split into chunks for vector search.
    """
    __tablename__ = "memory"

    id = Column(Integer, primary_key=True, index=True)
    text = Column(Text, nullable=False)  # Full text content
    
    # Optional metadata fields
    category = Column(String(100), nullable=True, index=True)
    source = Column(String(255), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    def __repr__(self):
        text_preview = self.text[:50] + "..." if len(self.text) > 50 else self.text
        return f"<Memory(id={self.id}, text='{text_preview}')>"


class MemoryChunk(Base):
    """
    Represents a chunk of a memory with its vector embedding.
    Supports semantic search via pgvector.
    """
    __tablename__ = "memory_chunk"

    id = Column(Integer, primary_key=True, index=True)
    memory_id = Column(
        Integer,
        ForeignKey("memory.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    chunk_text = Column(Text, nullable=False)
    chunk_index = Column(Integer, nullable=False)  # Order within memory (0-based)
    embedding = Column(Vector(1536))  # text-embedding-3-small dimension
    
    # Timestamp
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Composite index for efficient queries
    __table_args__ = (
        Index('idx_memory_chunk_index', memory_id, chunk_index),
    )
    
    def __repr__(self):
        text_preview = self.chunk_text[:50] + "..." if len(self.chunk_text) > 50 else self.chunk_text
        return f"<MemoryChunk(id={self.id}, memory_id={self.memory_id}, index={self.chunk_index}, text='{text_preview}')>"


class MemoryEdge(Base):
    """
    Represents a similarity relationship between two memories.
    Weight represents the similarity score (0.0 to 1.0).
    """
    __tablename__ = "memory_edge"

    source_id = Column(
        Integer,
        ForeignKey("memory.id", ondelete="CASCADE"),
        primary_key=True,
    )
    target_id = Column(
        Integer,
        ForeignKey("memory.id", ondelete="CASCADE"),
        primary_key=True,
    )
    weight = Column(Float, nullable=False)
    
    # Timestamp for when the edge was created
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Composite index for efficient queries
    __table_args__ = (
        Index('idx_memory_edge_weight_desc', weight.desc()),
    )
    
    def __repr__(self):
        return f"<MemoryEdge(source={self.source_id}, target={self.target_id}, weight={self.weight:.3f})>"
