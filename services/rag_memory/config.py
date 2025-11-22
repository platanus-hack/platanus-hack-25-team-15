"""
Configuration settings for RAG Memory Service.
"""
import os
from dataclasses import dataclass


@dataclass
class RagConfig:
    """Configuration for RAG Memory Service."""
    
    # Database settings
    database_url: str = os.getenv(
        "RAG_DATABASE_URL",
        "postgresql://postgres:postgres@localhost:5432/ragdb"
    )
    
    # OpenAI settings
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    embedding_model: str = "text-embedding-3-small"
    embedding_dimension: int = 1536
    
    # Memory graph settings
    similarity_threshold: float = 0.7  # Minimum similarity to create edge (0.0 to 1.0)
    max_similar_connections: int = 5  # Max connections per memory
    
    # Embedding cache settings
    cache_enabled: bool = True
    max_cache_size: int = 10000
    
    # Database connection pool settings
    pool_size: int = 10
    max_overflow: int = 20
    pool_recycle: int = 3600  # seconds
    
    # Search settings
    default_search_limit: int = 10
    max_search_limit: int = 100
    
    # Chunking settings
    chunk_size_words: int = 400  # Number of words per chunk
    chunk_overlap_words: int = 80  # Number of overlapping words between chunks
    
    # Logging
    log_level: str = os.getenv("LOG_LEVEL", "INFO")
    
    def validate(self) -> None:
        """Validate configuration settings."""
        if not self.openai_api_key:
            raise ValueError("OPENAI_API_KEY must be set")
        
        if not 0.0 <= self.similarity_threshold <= 1.0:
            raise ValueError("similarity_threshold must be between 0.0 and 1.0")
        
        if self.max_similar_connections < 1:
            raise ValueError("max_similar_connections must be at least 1")
        
        if self.embedding_dimension not in [1536, 3072]:
            raise ValueError("embedding_dimension must be 1536 or 3072")


# Global config instance
config = RagConfig()

