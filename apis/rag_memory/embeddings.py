import os
import hashlib
import logging
from typing import List, Dict, Optional
from openai import OpenAI, OpenAIError

logger = logging.getLogger(__name__)

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

if not OPENAI_API_KEY:
    raise RuntimeError("OPENAI_API_KEY environment variable is not set.")

client = OpenAI(api_key=OPENAI_API_KEY)


class EmbeddingGenerator:
    """
    Wrapper around OpenAI embeddings API.
    Uses text-embedding-3-small by default.
    Includes caching to avoid redundant API calls.
    """

    def __init__(
        self,
        model_name: str = "text-embedding-3-small",
        cache_enabled: bool = True,
        max_cache_size: int = 10000,
    ):
        self.model_name = model_name
        self.cache_enabled = cache_enabled
        self.max_cache_size = max_cache_size
        self._cache: Dict[str, List[float]] = {}

    def _get_cache_key(self, text: str) -> str:
        """Generate a cache key for the given text."""
        return hashlib.sha256(text.encode("utf-8")).hexdigest()

    def generate_embedding(self, text: str) -> List[float]:
        """
        Generate a single embedding vector for the given text.
        Uses cache if enabled to avoid redundant API calls.
        
        Args:
            text: The text to embed
            
        Returns:
            List of floats representing the embedding vector
            
        Raises:
            ValueError: If text is empty or too long
            OpenAIError: If the API call fails
        """
        if not text or not text.strip():
            raise ValueError("Text cannot be empty")
        
        if len(text) > 8000:  # OpenAI token limit is ~8191 tokens
            logger.warning(f"Text length {len(text)} exceeds recommended limit")
        
        # Check cache first
        if self.cache_enabled:
            cache_key = self._get_cache_key(text)
            if cache_key in self._cache:
                logger.debug(f"Cache hit for text: {text[:50]}...")
                return self._cache[cache_key]
        
        try:
            response = client.embeddings.create(
                model=self.model_name,
                input=text,
            )
            embedding = response.data[0].embedding
            
            # Store in cache
            if self.cache_enabled:
                if len(self._cache) >= self.max_cache_size:
                    # Simple FIFO eviction
                    first_key = next(iter(self._cache))
                    del self._cache[first_key]
                    logger.debug("Cache eviction triggered")
                
                self._cache[cache_key] = embedding
            
            logger.debug(f"Generated embedding for text: {text[:50]}...")
            return embedding
            
        except OpenAIError as e:
            logger.error(f"OpenAI API error: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error generating embedding: {e}")
            raise

    def generate_embeddings_batch(self, texts: List[str]) -> List[List[float]]:
        """
        Generate embeddings for multiple texts in a single API call.
        More efficient than calling generate_embedding multiple times.
        
        Args:
            texts: List of texts to embed
            
        Returns:
            List of embedding vectors
        """
        if not texts:
            return []
        
        # Validate all texts
        for text in texts:
            if not text or not text.strip():
                raise ValueError("All texts must be non-empty")
        
        # Check cache for all texts
        if self.cache_enabled:
            results = []
            uncached_texts = []
            uncached_indices = []
            
            for i, text in enumerate(texts):
                cache_key = self._get_cache_key(text)
                if cache_key in self._cache:
                    results.append((i, self._cache[cache_key]))
                else:
                    uncached_texts.append(text)
                    uncached_indices.append(i)
            
            if not uncached_texts:
                # All cached
                return [emb for _, emb in sorted(results)]
        else:
            uncached_texts = texts
            uncached_indices = list(range(len(texts)))
            results = []
        
        try:
            # Batch API call for uncached texts
            response = client.embeddings.create(
                model=self.model_name,
                input=uncached_texts,
            )
            
            # Process results
            for i, data in enumerate(response.data):
                embedding = data.embedding
                original_index = uncached_indices[i]
                text = uncached_texts[i]
                
                results.append((original_index, embedding))
                
                # Cache the result
                if self.cache_enabled:
                    cache_key = self._get_cache_key(text)
                    if len(self._cache) >= self.max_cache_size:
                        first_key = next(iter(self._cache))
                        del self._cache[first_key]
                    self._cache[cache_key] = embedding
            
            # Sort by original index and return embeddings
            return [emb for _, emb in sorted(results)]
            
        except OpenAIError as e:
            logger.error(f"OpenAI API error in batch: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error in batch embedding: {e}")
            raise

    def clear_cache(self):
        """Clear the embedding cache."""
        self._cache.clear()
        logger.info("Embedding cache cleared")

    def get_cache_stats(self) -> Dict[str, int]:
        """Get cache statistics."""
        return {
            "size": len(self._cache),
            "max_size": self.max_cache_size,
        }
