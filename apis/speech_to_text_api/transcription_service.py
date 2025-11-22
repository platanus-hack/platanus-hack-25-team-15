"""
Transcription service using ElevenLabs API.
Transcribes audio from URL or base64 and stores in RAG memory via HTTP.
"""
import logging
from typing import Optional, Dict, Any, List, Tuple
import httpx
import base64
import tempfile
import os

from config import config

logger = logging.getLogger(__name__)


class TranscriptionService:
    """
    Service for transcribing audio files using ElevenLabs API.
    
    Provides functionality for:
    - Transcribing audio from URLs using ElevenLabs
    - Storing transcriptions in RAG memory system via HTTP
    """
    
    def __init__(
        self,
        api_key: Optional[str] = None,
        rag_service_url: Optional[str] = None,
    ):
        """
        Initialize the transcription service.
        
        Args:
            api_key: Optional ElevenLabs API key (uses config if not provided)
            rag_service_url: Optional RAG service URL (uses config if not provided)
        """
        self.api_key = api_key or config.elevenlabs_api_key
        if not self.api_key:
            raise ValueError("ElevenLabs API key is required")
        
        self.rag_service_url = rag_service_url or config.rag_service_url
        self.elevenlabs_api_url = config.elevenlabs_api_url
        
        logger.info(f"TranscriptionService initialized with RAG service at {self.rag_service_url}")
    
    async def transcribe_from_base64_direct(
        self,
        audio_base64: str,
        filename: Optional[str] = None,
        language_code: Optional[str] = None,
        model_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Transcribe audio directly from base64 using ElevenLabs API.
        Decodes base64, creates temporary file, and sends to ElevenLabs.
        
        Args:
            audio_base64: Base64 encoded audio data
            filename: Optional original filename
            language_code: Language code (e.g., 'es', 'en'). Defaults to config value
            model_id: Model ID to use. Defaults to config value
            
        Returns:
            Dictionary with transcription results
            
        Raises:
            ValueError: If base64 data is invalid
            httpx.HTTPError: If API request fails
        """
        if not audio_base64 or not audio_base64.strip():
            raise ValueError("Audio base64 data cannot be empty")
        
        logger.info(f"Transcribing audio from base64 data (filename: {filename or 'unknown'})")
        
        # Decode base64 and create temporary file
        try:
            audio_data = base64.b64decode(audio_base64)
        except Exception as e:
            raise ValueError(f"Invalid base64 data: {e}")
        
        # Determine file extension from filename or use default
        file_extension = ".wav"  # Default extension
        if filename:
            _, ext = os.path.splitext(filename)
            if ext:
                file_extension = ext
        
        # Create temporary file
        temp_file = None
        try:
            with tempfile.NamedTemporaryFile(delete=False, suffix=file_extension) as temp_file:
                temp_file.write(audio_data)
                temp_file_path = temp_file.name
            
            # Prepare request
            headers = {
                "xi-api-key": self.api_key,
            }
            
            # Prepare form data
            data = {
                "model_id": model_id or config.model_id,
            }
            
            # Add optional parameters
            if language_code or config.language_code:
                data["language_code"] = language_code or config.language_code

            if config.timestamps_granularity != "none":
                data["timestamps_granularity"] = config.timestamps_granularity
            
            # Prepare files for multipart upload
            files = {
                "file": (filename or "audio" + file_extension, open(temp_file_path, "rb"))
            }
            
            # Make API request
            async with httpx.AsyncClient(timeout=300.0) as client:
                try:
                    response = await client.post(
                        self.elevenlabs_api_url,
                        headers=headers,
                        data=data,
                        files=files,
                    )
                    response.raise_for_status()
                    
                    result = response.json()
                    logger.info("Transcription completed successfully")
                    return result
                    
                except httpx.HTTPError as e:
                    logger.error(f"ElevenLabs API error: {e}")
                    if hasattr(e, "response") and e.response is not None:
                        logger.error(f"Response: {e.response.text}")
                    raise
                finally:
                    # Close file handle
                    files["file"][1].close()
        
        finally:
            # Clean up temporary file
            if temp_file and os.path.exists(temp_file_path):
                try:
                    os.unlink(temp_file_path)
                except Exception as e:
                    logger.warning(f"Failed to delete temporary file {temp_file_path}: {e}")

    async def transcribe_from_url_direct(
        self,
        audio_url: str,
        language_code: Optional[str] = None,
        model_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Transcribe audio directly from URL using ElevenLabs API.
        Uses cloud_storage_url parameter to avoid downloading the file.
        
        Args:
            audio_url: URL of the audio file
            language_code: Language code (e.g., 'es', 'en'). Defaults to config value
            model_id: Model ID to use. Defaults to config value
            
        Returns:
            Dictionary with transcription results
            
        Raises:
            ValueError: If URL is invalid
            httpx.HTTPError: If API request fails
        """
        if not audio_url or not audio_url.strip():
            raise ValueError("Audio URL cannot be empty")
        
        logger.info(f"Transcribing audio from URL: {audio_url}")
        
        # Prepare request
        headers = {
            "xi-api-key": self.api_key,
        }
        
        # Prepare form data
        data = {
            "model_id": model_id or config.model_id,
            "cloud_storage_url": audio_url,
        }
        
        # Add optional parameters
        if language_code or config.language_code:
            data["language_code"] = language_code or config.language_code

        if config.timestamps_granularity != "none":
            data["timestamps_granularity"] = config.timestamps_granularity
        
        # Make API request
        async with httpx.AsyncClient(timeout=300.0) as client:
            try:
                response = await client.post(
                    self.elevenlabs_api_url,
                    headers=headers,
                    data=data,
                )
                response.raise_for_status()
                
                result = response.json()
                logger.info("Transcription completed successfully")
                return result
                
            except httpx.HTTPError as e:
                logger.error(f"ElevenLabs API error: {e}")
                if hasattr(e, "response") and e.response is not None:
                    logger.error(f"Response: {e.response.text}")
                raise
    
    async def transcribe_from_base64(
        self,
        audio_base64: str,
        filename: Optional[str] = None,
        category: Optional[str] = None,
        source: Optional[str] = None,
        language_code: Optional[str] = None,
        model_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Transcribe audio from base64 and store in RAG memory.
        
        Args:
            audio_base64: Base64 encoded audio data
            filename: Optional original filename
            category: Optional category for the memory
            source: Optional source identifier (defaults to filename)
            language_code: Language code for transcription
            model_id: Model ID to use for transcription
            
        Returns:
            Dictionary with:
                - transcription: The transcription result from ElevenLabs
                - memory: The created Memory object
                - filename: The original filename
                
        Raises:
            ValueError: If base64 data is invalid
            httpx.HTTPError: If transcription fails
        """
        # Transcribe using base64 data
        transcription_result = await self.transcribe_from_base64_direct(
            audio_base64=audio_base64,
            filename=filename,
            language_code=language_code,
            model_id=model_id,
        )
        
        # Extract text from transcription result
        # ElevenLabs returns the transcript in the 'text' field
        transcription_text = transcription_result.get("text", "")
        
        if not transcription_text:
            raise ValueError("Transcription returned empty text")
        
        # Store in RAG memory via HTTP
        memory = await self._add_memory_via_http(
            text=transcription_text,
            category=category or "audio_transcription",
            source=source or filename or "base64_audio",
        )
        
        logger.info(f"Transcription stored in RAG memory with ID: {memory['id']}")
        
        return {
            "transcription": transcription_result,
            "memory": memory,
            "filename": filename,
        }

    async def transcribe_from_url(
        self,
        audio_url: str,
        category: Optional[str] = None,
        source: Optional[str] = None,
        language_code: Optional[str] = None,
        model_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Transcribe audio from URL and store in RAG memory.
        
        Args:
            audio_url: URL of the audio file
            category: Optional category for the memory
            source: Optional source identifier (defaults to audio_url)
            language_code: Language code for transcription
            model_id: Model ID to use for transcription
            
        Returns:
            Dictionary with:
                - transcription: The transcription result from ElevenLabs
                - memory: The created Memory object
                - audio_url: The original audio URL
                
        Raises:
            ValueError: If URL is invalid
            httpx.HTTPError: If transcription fails
        """
        # Transcribe using cloud_storage_url
        transcription_result = await self.transcribe_from_url_direct(
            audio_url=audio_url,
            language_code=language_code,
            model_id=model_id,
        )
        
        # Extract text from transcription result
        # ElevenLabs returns the transcript in the 'text' field
        transcription_text = transcription_result.get("text", "")
        
        if not transcription_text:
            raise ValueError("Transcription returned empty text")
        
        # Store in RAG memory via HTTP
        memory = await self._add_memory_via_http(
            text=transcription_text,
            category=category or "audio_transcription",
            source=source or audio_url,
        )
        
        logger.info(f"Transcription stored in RAG memory with ID: {memory['id']}")
        
        return {
            "transcription": transcription_result,
            "memory": memory,
            "audio_url": audio_url,
        }
    
    async def get_transcription_memory(self, memory_id: int) -> Optional[Dict[str, Any]]:
        """
        Retrieve a transcription memory by ID via HTTP.
        
        Args:
            memory_id: The ID of the memory
            
        Returns:
            Memory dict if found, None otherwise
        """
        return await self._get_memory_via_http(memory_id)
    
    async def search_transcriptions(
        self,
        query: str,
        limit: int = 5,
        category: str = "audio_transcription",
    ) -> List[Tuple[Dict[str, Any], float]]:
        """
        Search for transcriptions similar to the query text via HTTP.
        
        Args:
            query: Search query text
            limit: Maximum number of results
            category: Category to filter by (defaults to audio_transcription)
            
        Returns:
            List of tuples (memory_dict, similarity_score)
        """
        return await self._search_memories_via_http(
            query=query,
            limit=limit,
            category=category,
        )
    
    # HTTP helper methods for RAG service communication
    
    async def _add_memory_via_http(
        self,
        text: str,
        category: Optional[str] = None,
        source: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Add memory to RAG service via HTTP."""
        async with httpx.AsyncClient(timeout=config.rag_service_timeout) as client:
            try:
                response = await client.post(
                    f"{self.rag_service_url}/memories",
                    json={
                        "text": text,
                        "category": category,
                        "source": source,
                    },
                )
                response.raise_for_status()
                return response.json()
            except httpx.HTTPError as e:
                logger.error(f"Error adding memory to RAG service: {e}")
                raise ValueError(f"Failed to store memory in RAG service: {e}")
    
    async def _get_memory_via_http(self, memory_id: int) -> Optional[Dict[str, Any]]:
        """Get memory from RAG service via HTTP."""
        async with httpx.AsyncClient(timeout=config.rag_service_timeout) as client:
            try:
                response = await client.get(f"{self.rag_service_url}/memories/{memory_id}")
                if response.status_code == 404:
                    return None
                response.raise_for_status()
                return response.json()
            except httpx.HTTPError as e:
                logger.error(f"Error getting memory from RAG service: {e}")
                return None
    
    async def _search_memories_via_http(
        self,
        query: str,
        limit: int = 5,
        category: Optional[str] = None,
    ) -> List[Tuple[Dict[str, Any], float]]:
        """Search memories in RAG service via HTTP."""
        async with httpx.AsyncClient(timeout=config.rag_service_timeout) as client:
            try:
                params = {
                    "query": query,
                    "limit": limit,
                }
                if category:
                    params["category"] = category
                
                response = await client.get(
                    f"{self.rag_service_url}/search",
                    params=params,
                )
                response.raise_for_status()
                
                # Convert API response format to expected tuple format
                search_results = response.json()
                return [
                    (result["memory"], result["similarity_score"])
                    for result in search_results
                ]
            except httpx.HTTPError as e:
                logger.error(f"Error searching memories in RAG service: {e}")
                return []

