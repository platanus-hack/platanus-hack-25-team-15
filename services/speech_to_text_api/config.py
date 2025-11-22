"""
Configuration settings for Speech to Text Service.
"""
import os
from dataclasses import dataclass


@dataclass
class SpeechToTextConfig:
    """Configuration for Speech to Text Service."""
    
    # ElevenLabs API settings
    elevenlabs_api_key: str = os.getenv("ELEVENLABS_API_KEY", "")
    elevenlabs_api_url: str = "https://api.elevenlabs.io/v1/speech-to-text"
    
    # Model settings
    model_id: str = "scribe_v1"  # Default model for transcription
    
    # Transcription settings
    language_code: str = "es"  # Default to Spanish
    timestamps_granularity: str = "none"  # Options: none, word, character
    
    # Logging
    log_level: str = os.getenv("LOG_LEVEL", "INFO")
    
    def validate(self) -> None:
        """Validate configuration settings."""
        if not self.elevenlabs_api_key:
            raise ValueError("ELEVENLABS_API_KEY must be set")
        
        if self.timestamps_granularity not in ["none", "word", "character"]:
            raise ValueError("timestamps_granularity must be 'none', 'word', or 'character'")


# Global config instance
config = SpeechToTextConfig()

