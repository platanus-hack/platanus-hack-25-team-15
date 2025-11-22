# Speech-to-Text API Service

Service for transcribing audio files using ElevenLabs API and storing transcriptions in the RAG memory system.

## Overview

This service provides functionality to:
- Transcribe audio files from URLs using ElevenLabs API
- Store transcriptions automatically in the RAG memory system
- Search and retrieve stored transcriptions

## Components

### TranscriptionService

Main service class that handles audio transcription and memory storage.

#### Initialization

```python
from services.speech_to_text_api.transcription_service import TranscriptionService

# Basic initialization (uses config values)
service = TranscriptionService()

# Custom initialization
service = TranscriptionService(
    rag_service=custom_rag_service,  # Optional custom RAG service
    api_key="your_elevenlabs_api_key"  # Optional API key override
)
```

#### Methods

##### `transcribe_from_url_direct()`

Transcribes audio directly from a URL without storing in memory.

```python
result = await service.transcribe_from_url_direct(
    audio_url="https://example.com/audio.mp3",
    language_code="es",  # Optional: 'es', 'en', etc.
    model_id="eleven_turbo_v2_5"  # Optional: model to use
)

# Returns: Dict with transcription results from ElevenLabs
# {
#     "text": "transcribed text...",
#     "timestamps": [...],  # if enabled
#     ...
# }
```

##### `transcribe_from_url()`

Transcribes audio from URL and stores it in RAG memory.

```python
result = await service.transcribe_from_url(
    audio_url="https://example.com/audio.mp3",
    category="meeting_notes",  # Optional: categorize the memory
    source="zoom_call_123",  # Optional: source identifier
    language_code="es",  # Optional
    model_id="eleven_turbo_v2_5"  # Optional
)

# Returns: Dict with:
# {
#     "transcription": {...},  # ElevenLabs result
#     "memory": Memory(...),  # Created Memory object
#     "audio_url": "https://..."
# }
```

##### `get_transcription_memory()`

Retrieves a stored transcription by memory ID.

```python
memory = service.get_transcription_memory(memory_id=123)
# Returns: Memory object or None
```

##### `search_transcriptions()`

Searches for transcriptions similar to a query.

```python
results = service.search_transcriptions(
    query="project discussion",
    limit=5,  # Optional: max results
    category="audio_transcription"  # Optional: filter by category
)

# Returns: List of (Memory, similarity_score) tuples
```

## Configuration

Configuration is managed through `config.py`. Required settings:

- `ELEVENLABS_API_KEY`: Your ElevenLabs API key
- `ELEVENLABS_API_URL`: API endpoint (default: https://api.elevenlabs.io/v1/audio-intelligence/speech-to-text)
- `MODEL_ID`: Model to use (default: eleven_turbo_v2_5)
- `LANGUAGE_CODE`: Default language (optional)
- `TIMESTAMPS_GRANULARITY`: Timestamp detail level (default: none)

## Usage Examples

### Basic Transcription

```python
from services.speech_to_text_api.transcription_service import TranscriptionService

service = TranscriptionService()

# Transcribe and store
result = await service.transcribe_from_url(
    audio_url="https://example.com/meeting.mp3",
    category="meetings",
    source="weekly_standup"
)

print(f"Transcription: {result['transcription']['text']}")
print(f"Memory ID: {result['memory'].id}")
```

### Search Transcriptions

```python
# Search for related transcriptions
results = service.search_transcriptions(
    query="budget discussion",
    limit=3
)

for memory, score in results:
    print(f"Score: {score:.2f}")
    print(f"Text: {memory.text[:100]}...")
```

### Direct Transcription (without storage)

```python
# Just transcribe, don't store
result = await service.transcribe_from_url_direct(
    audio_url="https://example.com/audio.mp3",
    language_code="en"
)

print(result["text"])
```

## Error Handling

The service raises the following exceptions:

- `ValueError`: Invalid input (empty URL, empty transcription result)
- `httpx.HTTPError`: API request failures
- Check logs for detailed error information

## Dependencies

- `httpx`: Async HTTP client
- `rag_memory`: RAG memory system for storage and search
- ElevenLabs API access

## Logging

The service uses Python's standard logging. Configure logging level as needed:

```python
import logging
logging.getLogger("services.speech_to_text_api").setLevel(logging.INFO)
```

## Notes

- Audio files are transcribed directly from URLs (no local download required)
- Transcriptions are automatically chunked and embedded by the RAG system
- Default category is "audio_transcription" if not specified
- API timeout is set to 300 seconds for large files

