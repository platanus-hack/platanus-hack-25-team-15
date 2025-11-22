import os
import logging
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import Pool

logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv(
    "RAG_DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/ragdb",
)

# Create engine with connection pooling and better defaults
engine = create_engine(
    DATABASE_URL,
    echo=False,
    pool_size=10,  # Number of connections to keep open
    max_overflow=20,  # Additional connections when pool is full
    pool_pre_ping=True,  # Verify connections before using them
    pool_recycle=3600,  # Recycle connections after 1 hour
)

# Log connection pool events for debugging
@event.listens_for(Pool, "connect")
def receive_connect(dbapi_conn, connection_record):
    logger.debug("Database connection established")

@event.listens_for(Pool, "checkout")
def receive_checkout(dbapi_conn, connection_record, connection_proxy):
    logger.debug("Connection checked out from pool")

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

Base = declarative_base()
