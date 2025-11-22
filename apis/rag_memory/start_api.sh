#!/bin/bash
# Start script for RAG Memory Service API

echo "Starting RAG Memory Service API..."

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
export RAG_DATABASE_URL=${RAG_DATABASE_URL:-"postgresql://postgres:postgres@localhost:5432/ragdb"}
export OPENAI_API_KEY=${OPENAI_API_KEY:-""}
export LOG_LEVEL=${LOG_LEVEL:-"INFO"}

# Check if OpenAI API key is set
if [ -z "$OPENAI_API_KEY" ]; then
    echo "Warning: OPENAI_API_KEY environment variable is not set"
    echo "Please add it to your .env file or export it:"
    echo "echo 'OPENAI_API_KEY=your_api_key_here' >> .env"
    exit 1
fi

# Display loaded configuration
echo "Configuration loaded:"
echo "  RAG_DATABASE_URL: $RAG_DATABASE_URL"
echo "  LOG_LEVEL: $LOG_LEVEL"
echo "  OPENAI_API_KEY: ${OPENAI_API_KEY:0:8}..." # Show only first 8 chars for security

# Start the API server
echo "Starting API server on http://0.0.0.0:8000"
echo "API documentation available at http://0.0.0.0:8000/docs"
python main.py
