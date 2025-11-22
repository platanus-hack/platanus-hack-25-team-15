#!/bin/bash
# Start script for Speech to Text Service API

echo "Starting Speech to Text Service API..."

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies
echo "Installing dependencies..."
pip install -r requirements.txt

# Load environment variables from .env file if it exists
if [ -f ".env" ]; then
    echo "Loading environment variables from .env file..."
    export $(grep -v '^#' .env | xargs)
else
    echo "No .env file found, using default values..."
fi

# Set environment variables if not set (fallback defaults)
export ELEVENLABS_API_KEY=${ELEVENLABS_API_KEY:-""}
export RAG_SERVICE_URL=${RAG_SERVICE_URL:-"http://localhost:8000"}
export LOG_LEVEL=${LOG_LEVEL:-"INFO"}

# Check if ElevenLabs API key is set
if [ -z "$ELEVENLABS_API_KEY" ]; then
    echo "Warning: ELEVENLABS_API_KEY environment variable is not set"
    echo "Please add it to your .env file or export it:"
    echo "echo 'ELEVENLABS_API_KEY=your_api_key_here' >> .env"
    exit 1
fi

# Display loaded configuration
echo "Configuration loaded:"
echo "  RAG_SERVICE_URL: $RAG_SERVICE_URL"
echo "  LOG_LEVEL: $LOG_LEVEL"
echo "  ELEVENLABS_API_KEY: ${ELEVENLABS_API_KEY:0:8}..." # Show only first 8 chars for security

# Start the API server
echo "Starting API server on http://0.0.0.0:8001"
echo "API documentation available at http://0.0.0.0:8001/docs"
python main.py
