"""
Main entry point for Speech to Text Service API.
"""
import uvicorn
from api import app
from dotenv import load_dotenv
load_dotenv()

if __name__ == "__main__":
    uvicorn.run(
        "api:app",
        host="0.0.0.0",
        port=8001,
        reload=True,
        log_level="info"
    )
