# Mem0 + Custom Hosted Models Guide

This guide explains how to use your **self-hosted LLM** and **embedding model** with the Mem0 memory service, so memories are stored in Qdrant using your own infrastructure.

---

## 1. Environment variables

All memory configuration lives in your `.env`:

```env
MEM0_ENABLED=true

# Qdrant vector store
QDRANT_HOST=localhost
QDRANT_PORT=6333

# Custom embedding model (OpenAI-compatible endpoint)
CUSTOM_EMBEDDING_BASE_URL=http://your-embedding-server:8000/v1
CUSTOM_EMBEDDING_MODEL=your-embedding-model-name
MEM0_EMBEDDING_DIMS=768

# Custom LLM for memory fact extraction (OpenAI-compatible endpoint)
CUSTOM_LLM_BASE_URL=http://your-llm-server:8000/v1
CUSTOM_LLM_MODEL=Qwen/Qwen2.5-7B-Instruct
```

| Variable | Required | Description |
|----------|----------|-------------|
| `MEM0_ENABLED` | Yes | Set `true` to enable memory |
| `QDRANT_HOST` / `QDRANT_PORT` | Yes | Qdrant vector store address |
| `QDRANT_URL` | Alt | Full URL for Qdrant Cloud (replaces host/port) |
| `QDRANT_API_KEY` | No | API key for Qdrant Cloud |
| `CUSTOM_EMBEDDING_BASE_URL` | Yes | Base URL of your embedding server (include `/v1`) |
| `CUSTOM_EMBEDDING_MODEL` | No | Model name your server expects |
| `MEM0_EMBEDDING_DIMS` | No | Embedding dimensions (default: 768) |
| `CUSTOM_LLM_BASE_URL` | Yes | Base URL of your LLM server (include `/v1`) |
| `CUSTOM_LLM_MODEL` | No | Model name (default: `Qwen/Qwen2.5-7B-Instruct`) |
| `MEM0_COLLECTION_NAME` | No | Qdrant collection name (default: `youruniverse_memories`) |
| `MEMORY_SCORE_THRESHOLD` | No | Min relevance score to include a memory (default: 0.3) |
| `MEMORY_TIME_DECAY_FACTOR` | No | Time decay per hour (default: 0.0005) |
| `MEMORY_MAX_AGE_DAYS` | No | Max memory age before pruning (default: 30) |

No Gemini or OpenAI keys are needed for memory.

---

## 2. Endpoint requirements

### Embedding server

Must expose **OpenAI-style** `POST /v1/embeddings`:

```json
// Request
{ "input": ["text to embed"], "model": "your-model" }

// Response
{ "data": [{ "embedding": [0.1, 0.2, ...], "index": 0 }] }
```

### LLM server

Must expose **OpenAI-style** `POST /v1/chat/completions`:

```json
// Request
{ "model": "Qwen/Qwen2.5-7B-Instruct", "messages": [...] }

// Response  
{ "choices": [{ "message": { "content": "..." } }] }
```

Both endpoints use `apiKey: "dummy-key"` since your servers don't require auth.

---

## 3. Memory architecture

The system stores memories with metadata (`chatId`, `characterId`, `timestamp`) and retrieves across three scopes:

| Scope | Filter | Use case |
|-------|--------|----------|
| **chat** | `chatId` match | Current conversation context |
| **character** | `characterId` match | Interaction history with a specific character |
| **global** | userId only | User-wide preferences and background |

Retrieval fans out across all applicable scopes in parallel, deduplicates, applies time-decay scoring, and builds a categorised system prompt.

---

## 4. Memory management features

- **Time-decay scoring** — older memories rank lower automatically
- **Score threshold** — low-relevance memories are filtered out
- **Pruning** — `pruneMemories(userId)` removes stale/low-score entries
- **Stats** — `getMemoryStats(userId)` returns per-scope memory counts
- **Delete** — `deleteMemory(memoryId)` removes a specific memory
