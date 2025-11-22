"""
Text chunking utilities for splitting memories into overlapping chunks.
"""
from typing import List, Tuple
import re


class TextChunker:
    """
    Handles splitting text into overlapping chunks based on word count.
    """

    def __init__(self, chunk_size_words: int = 400, overlap_words: int = 80):
        """
        Initialize the text chunker.
        
        Args:
            chunk_size_words: Number of words per chunk
            overlap_words: Number of overlapping words between consecutive chunks
        """
        if chunk_size_words <= 0:
            raise ValueError("chunk_size_words must be positive")
        if overlap_words < 0:
            raise ValueError("overlap_words cannot be negative")
        if overlap_words >= chunk_size_words:
            raise ValueError("overlap_words must be less than chunk_size_words")
        
        self.chunk_size_words = chunk_size_words
        self.overlap_words = overlap_words

    def split_text(self, text: str) -> List[str]:
        """
        Split text into overlapping chunks.
        
        Args:
            text: The text to split
            
        Returns:
            List of text chunks
        """
        if not text or not text.strip():
            return []
        
        # Split text into words (preserving whitespace for reconstruction)
        words = self._tokenize_words(text)
        
        if not words:
            return []
        
        # If text is shorter than chunk size, return as single chunk
        if len(words) <= self.chunk_size_words:
            return [text.strip()]
        
        chunks = []
        start_idx = 0
        
        while start_idx < len(words):
            # Calculate end index for this chunk
            end_idx = min(start_idx + self.chunk_size_words, len(words))
            
            # Extract chunk words
            chunk_words = words[start_idx:end_idx]
            chunk_text = " ".join(chunk_words).strip()
            
            if chunk_text:
                chunks.append(chunk_text)
            
            # If we've reached the end, break
            if end_idx >= len(words):
                break
            
            # Move start index forward by (chunk_size - overlap)
            # This creates the overlap
            start_idx += (self.chunk_size_words - self.overlap_words)
        
        return chunks

    def _tokenize_words(self, text: str) -> List[str]:
        """
        Tokenize text into words.
        Uses simple whitespace splitting with some cleaning.
        
        Args:
            text: The text to tokenize
            
        Returns:
            List of words
        """
        # Normalize whitespace
        text = re.sub(r'\s+', ' ', text.strip())
        
        # Split on whitespace
        words = text.split()
        
        return words

    def get_chunk_info(self, text: str) -> List[Tuple[str, int, int]]:
        """
        Split text and return chunks with their word positions.
        
        Args:
            text: The text to split
            
        Returns:
            List of (chunk_text, start_word_idx, end_word_idx) tuples
        """
        if not text or not text.strip():
            return []
        
        words = self._tokenize_words(text)
        
        if not words:
            return []
        
        if len(words) <= self.chunk_size_words:
            return [(text.strip(), 0, len(words))]
        
        chunks_info = []
        start_idx = 0
        
        while start_idx < len(words):
            end_idx = min(start_idx + self.chunk_size_words, len(words))
            chunk_words = words[start_idx:end_idx]
            chunk_text = " ".join(chunk_words).strip()
            
            if chunk_text:
                chunks_info.append((chunk_text, start_idx, end_idx))
            
            if end_idx >= len(words):
                break
            
            start_idx += (self.chunk_size_words - self.overlap_words)
        
        return chunks_info

    def estimate_num_chunks(self, text: str) -> int:
        """
        Estimate the number of chunks that will be created from text.
        
        Args:
            text: The text to estimate
            
        Returns:
            Estimated number of chunks
        """
        if not text or not text.strip():
            return 0
        
        words = self._tokenize_words(text)
        num_words = len(words)
        
        if num_words <= self.chunk_size_words:
            return 1
        
        # Calculate number of chunks with overlap
        step_size = self.chunk_size_words - self.overlap_words
        num_chunks = 1 + ((num_words - self.chunk_size_words + step_size - 1) // step_size)
        
        return num_chunks

