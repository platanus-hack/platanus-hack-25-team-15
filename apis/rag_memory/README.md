# RAG Memory Service - Complete Documentation

A production-ready RAG (Retrieval-Augmented Generation) memory system with **chunk-based embeddings**, graph-based relationships, and semantic search capabilities.

> **🆕 Version 2.0**: Now with chunk-based embeddings for improved semantic search! See [Chunking System](#chunking-system) for details.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Chunking System](#chunking-system) 🆕
3. [Features](#features)
4. [Architecture](#architecture)
5. [Installation](#installation)
6. [Quick Start](#quick-start)
7. [Usage Examples](#usage-examples)
8. [API Reference](#api-reference)
9. [Configuration](#configuration)

---

## Overview

The RAG Memory Service is a sophisticated system for storing, retrieving, and analyzing textual memories using vector embeddings and graph relationships. It combines:

- **Chunk-Based Embeddings**: 🆕 Text is split into overlapping chunks for better semantic search
- **Vector Search**: Fast semantic search using OpenAI embeddings and pgvector
- **Graph Relationships**: Automatic similarity-based connections between memories
- **Advanced Analytics**: Clustering, path finding, and graph statistics
- **Production Ready**: Error handling, caching, logging, and optimization

### Key Capabilities

- ✅ 🆕 Automatic text chunking with configurable size and overlap
- ✅ Semantic search with configurable similarity thresholds
- ✅ Automatic relationship discovery between similar memories
- ✅ Category-based organization and filtering
- ✅ Graph traversal and path finding
- ✅ Batch operations for efficiency
- ✅ Embedding cache to reduce API costs
- ✅ Full CRUD operations
- ✅ Comprehensive error handling and logging

---

## Chunking System

### What is Chunking?

Instead of creating a single embedding for an entire document, the system now splits each memory into smaller, overlapping **chunks** that are individually vectorized. This provides several benefits:

- **Better Semantic Search**: Smaller chunks capture more specific semantic meanings
- **Scalability**: Can handle very long documents without hitting embedding limits
- **Granular Similarity**: Can find similarities between specific sections of documents
- **Reduced Noise**: Irrelevant parts don't dilute the embedding

### How It Works

```
Original Text (1000 words)
         ↓
    Text Chunker
         ↓
┌────────┴────────┐
│  Chunk 1 (400w) │ → Embedding 1
│  Chunk 2 (400w) │ → Embedding 2  (80 words overlap with Chunk 1)
│  Chunk 3 (400w) │ → Embedding 3  (80 words overlap with Chunk 2)
└─────────────────┘
```

### Configuration

Default chunking parameters (configurable in `config.py`):

```python
chunk_size_words: int = 400      # Number of words per chunk
chunk_overlap_words: int = 80    # Overlapping words between chunks
```

### Similarity Calculation

When comparing memories:
1. Each chunk of memory A is compared with chunks of memory B
2. The **maximum similarity** across all chunk pairs is used
3. This ensures partial matches are detected

### Example

```python
# Add a long document - automatically chunked
memory = service.add_memory(
    text="Your very long document here..." * 100,
    category="documentation"
)

# Get chunks for inspection
chunks = service.get_memory_chunks(memory.id)
print(f"Created {len(chunks)} chunks")

# Search works the same - query is also chunked automatically
results = service.search_similar_by_text(
    query_text="Your search query",
    limit=5
)
```

For more details, see [CHUNKING_GUIDE.md](CHUNKING_GUIDE.md).

---

## Features

### Core Features

- **Vector Embeddings**: Uses OpenAI's `text-embedding-3-small` (1536 dimensions)
- **Semantic Search**: Fast similarity search using pgvector with cosine distance
- **Memory Graph**: NetworkX-based graph for relationship traversal
- **Bidirectional Edges**: Automatic bidirectional similarity connections
- **Metadata Support**: Categories, sources, and timestamps
- **Batch Operations**: Efficient batch insertion and processing

### Advanced Features

- **Embedding Cache**: SHA256-based cache with LRU eviction (1000x faster)
- **Graph Analytics**: Clustering, path finding, and statistics
- **Configurable Thresholds**: Customizable similarity thresholds
- **Database Pooling**: Connection pooling for better performance
- **Error Handling**: Comprehensive try/catch blocks with logging
- **Type Safety**: Full type hints throughout

### Performance Optimizations

- IVFFlat indexes for fast vector search
- Connection pooling (10 base + 20 overflow)
- Embedding cache (10,000 entries)
- Batch API calls
- Optimized database queries

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    RagMemoryService                         │
│  - Add/Update/Delete memories                               │
│  - Semantic search (chunk-based)                            │
│  - Graph operations                                         │
└─────────────────┬───────────────────────────────────────────┘
                  │
        ┌─────────┴─────────┬─────────────┐
        │                   │             │
┌───────▼────────┐  ┌──────▼──────────┐ │
│ EmbeddingGen   │  │  MemoryGraph    │ │
│ - OpenAI API   │  │  - NetworkX     │ │
│ - Caching      │  │  - Traversal    │ │
│ - Batch ops    │  │  - Analytics    │ │
└───────┬────────┘  └──────┬──────────┘ │
        │                   │            │
        │          ┌────────▼────────┐   │
        │          │  TextChunker    │◄──┘
        │          │  - Split text   │
        │          │  - Overlap      │
        │          └────────┬────────┘
        │                   │
        └─────────┬─────────┘
                  │
        ┌─────────▼─────────┐
        │   PostgreSQL      │
        │   + pgvector      │
        │   - Memories      │
        │   - Chunks 🆕     │
        │   - Edges         │
        └───────────────────┘
```

### Database Schema

**Memory Table**: Stores full text without embeddings
- `id`: Primary key
- `text`: Full text content
- `category`, `source`: Metadata
- `created_at`, `updated_at`: Timestamps

**Memory Chunk Table** 🆕: Stores text chunks with embeddings
- `id`: Primary key
- `memory_id`: Foreign key to memory
- `chunk_text`: Chunk content
- `chunk_index`: Order within memory
- `embedding`: Vector(1536) for semantic search

**Memory Edge Table**: Stores similarity relationships
- `source_id`, `target_id`: Composite primary key
- `weight`: Similarity score (0.0 to 1.0)

### Components

1. **RagMemoryService**: Main service class with all operations
2. **EmbeddingGenerator**: Handles OpenAI API calls and caching
3. **MemoryGraphStore**: Manages in-memory NetworkX graph
4. **Database Layer**: PostgreSQL with pgvector extension
5. **Models**: SQLAlchemy ORM models (Memory, MemoryEdge)

---

## Installation

### Prerequisites

- Python 3.8+
- PostgreSQL 12+
- pgvector extension

### Step 1: Install Dependencies

```bash
pip install -r requirements.txt
```

Required packages:
```
openai==2.8.1
pgvector==0.4.1
psycopg2-binary==2.9.11
SQLAlchemy==2.0.44
networkx==3.4.2
numpy==2.2.6
python-dotenv==1.2.1
```

### Step 2: Set Up PostgreSQL

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE ragdb;

# Connect to the database
\c ragdb

# Enable pgvector extension
CREATE EXTENSION vector;
```

### Step 3: Run Migrations

```bash
psql -U postgres -d ragdb -f data/migrations/001_init_rag.sql
```

### Step 4: Configure Environment

Create a `.env` file:

```bash
OPENAI_API_KEY="your-openai-api-key-here"
RAG_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ragdb"
LOG_LEVEL="INFO"
```

---

## Quick Start

### Basic Usage

```python
from services.rag_memory import RagMemoryService

# Initialize service
service = RagMemoryService(
    auto_create_schema=True,
    similarity_threshold=0.7,
    max_similar_connections=5,
)

# Add a memory
memory = service.add_memory(
    text="Python is a versatile programming language",
    category="programming",
    source="documentation"
)

print(f"Created memory with ID: {memory.id}")

# Search for similar memories
results = service.search_similar_by_text(
    query_text="What is Python?",
    limit=5
)

for memory, score in results:
    print(f"[{score:.3f}] {memory.text}")
```

### Running Tests

```bash
# Basic tests
python apps/rag_test/main.py

# Advanced examples
python apps/rag_test/advanced_examples.py
```

---

## Usage Examples

### 1. Adding Memories

#### Single Memory

```python
memory = service.add_memory(
    text="Machine learning is a subset of artificial intelligence",
    category="ai",
    source="textbook"
)
```

#### Batch Insert (More Efficient)

```python
texts = [
    "Neural networks are inspired by biological neurons",
    "Deep learning uses multiple layers of neural networks",
    "Transformers revolutionized NLP"
]
categories = ["ai", "ai", "ai"]
sources = ["paper", "paper", "paper"]

memories = service.add_memories_batch(texts, categories, sources)
print(f"Created {len(memories)} memories")
```

### 2. Searching Memories

#### Basic Search

```python
results = service.search_similar_by_text(
    query_text="Tell me about neural networks",
    limit=5
)

for memory, score in results:
    print(f"Score: {score:.3f}")
    print(f"Text: {memory.text}")
    print(f"Category: {memory.category}")
    print("---")
```

#### Search with Filters

```python
results = service.search_similar_by_text(
    query_text="machine learning",
    limit=10,
    category="ai",              # Filter by category
    min_similarity=0.7          # Minimum similarity threshold
)
```

#### Search by Category

```python
ai_memories = service.search_by_category("ai", limit=20)
```

### 3. Retrieving Memories

#### Get by ID

```python
memory = service.get_memory(memory_id=1)
if memory:
    print(memory.text)
```

#### Get All Memories

```python
# With pagination
memories = service.get_all_memories(
    limit=50,
    offset=0,
    category="programming"
)

# Count total memories
total = service.count_memories()
total_ai = service.count_memories(category="ai")
```

### 4. Updating Memories

```python
# Update text (triggers re-embedding and edge recalculation)
updated = service.update_memory(
    memory_id=1,
    text="Updated text content",
    category="new_category"
)

# Update only metadata (no re-embedding)
updated = service.update_memory(
    memory_id=1,
    category="updated_category",
    source="new_source"
)
```

### 5. Deleting Memories

```python
success = service.delete_memory(memory_id=1)
if success:
    print("Memory deleted successfully")
```

### 6. Graph Operations

#### Get Neighbors

```python
# Get most similar memories
neighbors = service.get_memory_neighbors(memory_id=1, limit=5)

for neighbor_id, similarity in neighbors:
    neighbor = service.get_memory(neighbor_id)
    print(f"[{similarity:.3f}] {neighbor.text}")
```

#### Find Clusters

```python
# Get all memories in the same cluster
cluster = service.get_memory_cluster(memory_id=1)
print(f"Cluster contains {len(cluster)} memories: {cluster}")
```

#### Find Path Between Memories

```python
# Find shortest path in similarity graph
path = service.find_path_between_memories(
    source_id=1,
    target_id=10
)

if path:
    print("Path found:")
    for i, memory in enumerate(path):
        print(f"{i+1}. {memory.text}")
else:
    print("No path exists")
```

#### Graph Statistics

```python
stats = service.get_graph_statistics()

print(f"Total memories: {stats['total_memories']}")
print(f"Total edges: {stats['total_edges']}")
print(f"Connected components: {stats['connected_components']}")
print(f"Average degree: {stats['average_degree']:.2f}")
print(f"Graph density: {stats['graph_density']:.4f}")
print(f"Categories: {stats['categories']}")
```

### 7. Export Graph for Visualization

```python
graph_data = service.export_graph_json(
    max_nodes=100,
    category="ai"  # Optional filter
)

# Returns:
# {
#   "nodes": [{"id": 1, "label": "...", "category": "ai"}, ...],
#   "edges": [{"source": 1, "target": 2, "weight": 0.85}, ...],
#   "metadata": {"total_nodes": 100, "total_edges": 250, ...}
# }

# Can be used with D3.js, Cytoscape, etc.
```

### 8. Cache Management

```python
# Get cache statistics
stats = service.embedding_generator.get_cache_stats()
print(f"Cache size: {stats['size']}/{stats['max_size']}")

# Clear cache if needed
service.embedding_generator.clear_cache()
```

### 9. Rebuild Graph

```python
# If you manually modify the database
service.rebuild_graph()
```

---

## API Reference

### RagMemoryService

#### Constructor

```python
RagMemoryService(
    auto_create_schema: bool = True,
    similarity_threshold: float = 0.7,
    max_similar_connections: int = 5,
    load_graph: bool = True,
)
```

**Parameters:**
- `auto_create_schema`: Create database tables if they don't exist
- `similarity_threshold`: Minimum similarity to create edges (0.0-1.0)
- `max_similar_connections`: Max connections per memory
- `load_graph`: Load graph from database on initialization

#### Memory Operations

##### add_memory()
```python
def add_memory(
    text: str,
    category: Optional[str] = None,
    source: Optional[str] = None,
) -> Memory
```

Add a new memory to the system.

**Returns:** Memory object with id, text, embedding, timestamps

**Raises:** 
- `ValueError`: If text is empty
- `SQLAlchemyError`: If database operation fails

##### add_memories_batch()
```python
def add_memories_batch(
    texts: List[str],
    categories: Optional[List[str]] = None,
    sources: Optional[List[str]] = None,
) -> List[Memory]
```

Add multiple memories efficiently in a batch.

##### get_memory()
```python
def get_memory(memory_id: int) -> Optional[Memory]
```

Retrieve a memory by its ID.

##### get_all_memories()
```python
def get_all_memories(
    limit: Optional[int] = None,
    offset: int = 0,
    category: Optional[str] = None,
) -> List[Memory]
```

Retrieve all memories with optional filtering and pagination.

##### update_memory()
```python
def update_memory(
    memory_id: int,
    text: Optional[str] = None,
    category: Optional[str] = None,
    source: Optional[str] = None,
) -> Optional[Memory]
```

Update a memory's content and/or metadata.

##### delete_memory()
```python
def delete_memory(memory_id: int) -> bool
```

Delete a memory and all its edges.

##### count_memories()
```python
def count_memories(category: Optional[str] = None) -> int
```

Count total number of memories.

#### Search Operations

##### search_similar_by_text()
```python
def search_similar_by_text(
    query_text: str,
    limit: int = 5,
    category: Optional[str] = None,
    min_similarity: Optional[float] = None,
) -> List[Tuple[Memory, float]]
```

Search for memories similar to the query text.

**Returns:** List of (Memory, similarity_score) tuples

##### search_by_category()
```python
def search_by_category(
    category: str,
    limit: Optional[int] = None
) -> List[Memory]
```

Search memories by category.

#### Graph Operations

##### get_memory_neighbors()
```python
def get_memory_neighbors(
    memory_id: int,
    limit: int = 5,
) -> List[Tuple[int, float]]
```

Get the most similar neighbors of a memory.

**Returns:** List of (neighbor_id, similarity_score) tuples

##### get_memory_cluster()
```python
def get_memory_cluster(memory_id: int) -> List[int]
```

Get all memories in the same connected component.

##### find_path_between_memories()
```python
def find_path_between_memories(
    source_id: int,
    target_id: int,
) -> Optional[List[Memory]]
```

Find the shortest path between two memories.

##### get_graph_statistics()
```python
def get_graph_statistics() -> Dict[str, Any]
```

Get statistics about the memory graph.

##### export_graph_json()
```python
def export_graph_json(
    max_nodes: int = 500,
    category: Optional[str] = None,
) -> Dict[str, Any]
```

Export the memory graph as JSON for visualization.

##### rebuild_graph()
```python
def rebuild_graph() -> None
```

Rebuild the entire in-memory graph from the database.

---

## Configuration

### Environment Variables

```bash
# Required
OPENAI_API_KEY="sk-..."

# Optional
RAG_DATABASE_URL="postgresql://user:pass@host:port/dbname"
LOG_LEVEL="INFO"  # DEBUG, INFO, WARNING, ERROR
```

### Service Configuration

```python
from services.rag_memory import RagMemoryService

service = RagMemoryService(
    auto_create_schema=True,
    similarity_threshold=0.7,      # 0.0 to 1.0
    max_similar_connections=5,     # Number of edges per memory
    load_graph=True,               # Load graph on init
)
```

### Configuration File

Edit `services/rag_memory/config.py`:

```python
@dataclass
class RagConfig:
    # Database settings
    database_url: str = "postgresql://..."
    
    # OpenAI settings
    embedding_model: str = "text-embedding-3-small"
    embedding_dimension: int = 1536
    
    # Memory graph settings
    similarity_threshold: float = 0.7
    max_similar_connections: int = 5
    
    # Cache settings
    cache_enabled: bool = True
    max_cache_size: int = 10000
    
    # Connection pool
    pool_size: int = 10
    max_overflow: int = 20
```

### Recommended Settings

#### Development
```python
service = RagMemoryService(
    similarity_threshold=0.6,      # More permissive
    max_similar_connections=10,    # More connections
)
```

#### Production
```python
service = RagMemoryService(
    auto_create_schema=False,      # Schema already exists
    similarity_threshold=0.75,     # More strict
    max_similar_connections=5,     # Fewer connections
)
```

#### Testing
```python
service = RagMemoryService(
    similarity_threshold=0.5,      # Very permissive
    max_similar_connections=3,     # Few connections
    load_graph=False,              # Don't load graph
)
```

---

### Database Indexes

The migration creates these indexes automatically:

```sql
-- Primary key index
CREATE INDEX idx_memory_id ON memory (id);

-- Timestamp index for sorting
CREATE INDEX idx_memory_created_at ON memory (created_at DESC);

-- Category index for filtering
CREATE INDEX idx_memory_category ON memory (category);

-- Vector index for similarity search
CREATE INDEX idx_memory_embedding_cosine
ON memory USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Edge indexes
CREATE INDEX idx_memory_edge_source ON memory_edge (source_id);
CREATE INDEX idx_memory_edge_target ON memory_edge (target_id);
CREATE INDEX idx_memory_edge_weight ON memory_edge (weight DESC);
```

---

## Best Practices

### 1. Memory Organization

```python
# Use categories for organization
service.add_memory(
    text="...",
    category="programming",  # Organize by topic
    source="documentation"   # Track source
)
```

### 2. Similarity Threshold

- **0.5-0.6**: Very permissive, many connections
- **0.7-0.8**: Balanced (recommended)
- **0.8-0.9**: Very strict, few connections

```python
# Adjust based on your use case
service = RagMemoryService(similarity_threshold=0.75)
```

### 3. Batch Processing

```python
# Process multiple memories at once
if len(texts) > 1:
    service.add_memories_batch(texts)
else:
    service.add_memory(texts[0])
```

### 4. Error Handling

```python
try:
    memory = service.add_memory(text)
except ValueError as e:
    print(f"Invalid input: {e}")
except Exception as e:
    print(f"Error: {e}")
```

### 5. Monitoring

```python
# Check graph health regularly
stats = service.get_graph_statistics()
if stats['connected_components'] > expected:
    print("Warning: Graph is fragmented")

# Monitor cache efficiency
cache_stats = service.embedding_generator.get_cache_stats()
print(f"Cache usage: {cache_stats['size']}/{cache_stats['max_size']}")
```

### 6. Memory Management

```python
# Clear cache periodically if needed
if cache_stats['size'] > 8000:
    service.embedding_generator.clear_cache()

# Rebuild graph after manual DB changes
service.rebuild_graph()
```

---

## Advanced Use Cases

### 1. Knowledge Base

```python
# Build categorized knowledge base
programming_facts = [
    "Python is a high-level language",
    "JavaScript runs in browsers",
    "Rust provides memory safety",
]

service.add_memories_batch(
    texts=programming_facts,
    categories=["programming"] * len(programming_facts),
    sources=["docs"] * len(programming_facts)
)

# Query knowledge base
results = service.search_similar_by_text(
    "What language for web development?",
    category="programming"
)
```

### 2. Conversation Memory

```python
# Store conversation turns
conversation = [
    ("user", "Tell me about ML"),
    ("assistant", "ML is about training models..."),
    ("user", "What language should I use?"),
    ("assistant", "Python is most popular..."),
]

for speaker, text in conversation:
    service.add_memory(
        text=f"{speaker}: {text}",
        category="conversation",
        source="session_123"
    )

# Retrieve relevant context
context = service.search_similar_by_text(
    "What was said about Python?",
    category="conversation"
)
```

### 3. Document Clustering

```python
# Add documents
documents = [
    ("Neural networks mimic biological neurons", "ai"),
    ("React is a JavaScript UI library", "webdev"),
    ("Docker packages applications", "devops"),
]

for text, category in documents:
    service.add_memory(text, category=category)

# Analyze clusters
cluster = service.get_memory_cluster(memory_id=1)
print(f"Cluster size: {len(cluster)}")
```

### 4. Semantic Navigation

```python
# Create concept chain
concepts = [
    "Programming is writing code",
    "Code is written in languages like Python",
    "Python is popular for data science",
    "Data science uses machine learning",
]

concept_ids = []
for concept in concepts:
    memory = service.add_memory(concept)
    concept_ids.append(memory.id)

# Find path between concepts
path = service.find_path_between_memories(
    concept_ids[0],
    concept_ids[-1]
)
```
