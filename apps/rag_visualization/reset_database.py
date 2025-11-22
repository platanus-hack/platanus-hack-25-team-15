"""
Reset RAG database by dropping all tables and running the migration script.
This will completely wipe the database and recreate it from scratch.
"""
import sys
import logging
import re
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

# Import database module directly to avoid __init__.py issues
sys.path.insert(0, str(project_root / "apis" / "rag_memory"))
from database import engine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def split_sql_statements(sql_content: str) -> list:
    """
    Split SQL content into individual statements.
    Handles multi-line statements and comments properly.
    """
    # Remove single-line comments
    lines = []
    for line in sql_content.split('\n'):
        if '--' in line:
            comment_pos = line.find('--')
            line = line[:comment_pos]
        lines.append(line)
    
    # Join lines and split by semicolon
    full_sql = '\n'.join(lines)
    
    # Split by semicolon, but keep statements that span multiple lines
    statements = []
    current_statement = []
    
    for part in re.split(r';(?=\s|$)', full_sql):
        part = part.strip()
        if part:
            statements.append(part)
    
    # Filter out empty statements
    return [s for s in statements if s and not s.startswith('--')]


def reset_database():
    """
    Drop all tables and recreate the database schema by running the migration SQL.
    This will delete all data in the database.
    """
    logger.warning("=" * 60)
    logger.warning("WARNING: This will DELETE ALL DATA in the database!")
    logger.warning("=" * 60)
    
    # Path to migration file
    migration_file = project_root / "data" / "migrations" / "001_init_rag.sql"
    
    if not migration_file.exists():
        logger.error(f"Migration file not found: {migration_file}")
        return False
    
    logger.info(f"Reading migration file: {migration_file}")
    
    # Read the SQL migration file
    try:
        with open(migration_file, "r", encoding="utf-8") as f:
            sql_content = f.read()
    except Exception as e:
        logger.error(f"Failed to read migration file: {e}")
        return False
    
    logger.info("Executing migration SQL...")
    
    # Parse database URL to get connection parameters
    db_url = engine.url
    try:
        # Use psycopg2 directly to execute the SQL script
        conn = psycopg2.connect(
            host=db_url.host or "localhost",
            port=db_url.port or 5432,
            database=db_url.database,
            user=db_url.username,
            password=db_url.password,
        )
        
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()
        
        try:
            # Split SQL into individual statements
            statements = split_sql_statements(sql_content)
            logger.info(f"Found {len(statements)} SQL statements to execute")
            
            # Execute each statement separately
            for i, statement in enumerate(statements, 1):
                if not statement or statement.strip() == ';':
                    continue
                
                # Log first 50 chars of statement for debugging
                stmt_preview = statement[:50].replace('\n', ' ')
                logger.debug(f"Executing statement {i}/{len(statements)}: {stmt_preview}...")
                
                try:
                    cursor.execute(statement)
                except psycopg2.Error as e:
                    logger.error(f"Error in statement {i}: {e}")
                    logger.error(f"Statement was: {statement[:200]}...")
                    raise
            
            logger.info("✓ Database reset completed successfully!")
            logger.info("✓ All tables dropped and recreated")
            logger.info("✓ Migration script executed")
            return True
            
        except Exception as e:
            logger.error(f"Error executing migration: {e}")
            raise
        finally:
            cursor.close()
            conn.close()
            
    except psycopg2.Error as e:
        logger.error(f"Database error during reset: {e}")
        return False
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return False


if __name__ == "__main__":
    success = reset_database()
    sys.exit(0 if success else 1)