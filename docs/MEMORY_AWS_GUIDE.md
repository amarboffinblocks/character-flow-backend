# Mem0 + AWS / Self-Hosted Models Guide

This guide explains how to use your **AWS-hosted LLM** and an **embedding model** with the Mem0 memory service, so memories are stored in Qdrant using your own infrastructure.

---

## 1. Connecting a custom AWS-hosted LLM

Mem0 uses an LLM for **fact extraction** when adding memories (e.g. turning “I love pizza” into a structured memory). You can point this to any **OpenAI-compatible chat completions** endpoint (e.g. vLLM, Sagemaker, or a gateway).

### Requirements

- Your endpoint must expose **OpenAI-style** `POST /v1/chat/completions` (same request/response shape as OpenAI).
- Base URL should be the **prefix** before `/v1` (e.g. `https://your-endpoint.aws.com` if completions are at `https://your-endpoint.aws.com/v1/chat/completions`).

### Configuration

In `.env`:

```env
MEM0_ENABLED=true

# Your AWS / custom LLM (OpenAI-compatible)
MEM0_LLM_BASE_URL=https://your-llm-endpoint.aws.com/v1
MEM0_LLM_MODEL=your-model-id

# If your endpoint requires an API key
MEM0_CUSTOM_API_KEY=your-api-key
```

- **MEM0_LLM_BASE_URL** – Base URL of the API (including `/v1`).
- **MEM0_LLM_MODEL** – Model name/id your server expects (e.g. `meta-llama/Llama-3.2-3B` for vLLM).
- **MEM0_CUSTOM_API_KEY** – Optional; use if the endpoint expects an `Authorization: Bearer ...` header.

The memory service uses the **OpenAI provider** with `baseURL` so all Mem0 LLM calls go to your endpoint. No Gemini/OpenAI keys are required for the LLM when this is set.

---

## 2. Embedding model for AWS (for testing)

For **lightweight, self-hosted embeddings** on AWS, a good choice is:

| Model | Dimensions | Notes |
|-------|------------|--------|
| **sentence-transformers/all-MiniLM-L6-v2** | **384** | Small (~22M params, ~88 MB), fast on CPU, good for testing. |
| **nomic-ai/nomic-embed-text-v1.5** (via Ollama) | 768 | Better quality; run via Ollama on EC2. |

**Recommendation for testing:** use **all-MiniLM-L6-v2** (384 dims): low resource use, easy to run on a single small instance or via Hugging Face Inference Endpoints on AWS.

If you host it yourself (e.g. FastAPI + `sentence-transformers`), expose an **OpenAI-compatible** `POST /v1/embeddings` endpoint so Mem0 can call it. Alternatively, use **Ollama** on EC2 with an embedding model (see below); that works with the current Mem0 setup without an OpenAI-compatible API.

---

## 3. Configuring the embedder in Mem0

You have two supported options: **Ollama** (recommended for quick testing) or an **OpenAI-compatible** embedding API.

### Option A: Ollama embedder (recommended for testing)

Run [Ollama](https://ollama.com) on an EC2 (or any host) and pull an embedding model. Mem0 talks to it via the **Ollama** provider (no OpenAI-compatible API needed).

1. **On your EC2 (or server):**
   ```bash
   curl -fsSL https://ollama.com/install.sh | sh
   ollama pull nomic-embed-text
   ```
2. **In `.env`:**
   ```env
   MEM0_ENABLED=true
   MEM0_OLLAMA_EMBEDDER_URL=http://your-ec2-host:11434
   MEM0_OLLAMA_EMBEDDER_MODEL=nomic-embed-text:latest
   MEM0_EMBEDDING_DIMS=768
   ```
   Replace `your-ec2-host` with the host/IP (and ensure port 11434 is open).

Mem0 will use this for both **adding** and **searching** memories; vectors are stored in Qdrant with dimension 768.

### Option B: OpenAI-compatible embedding endpoint

If you host an embedding service that exposes **OpenAI-style** `POST /v1/embeddings` (e.g. Hugging Face Inference Endpoints, or your own FastAPI wrapper around `all-MiniLM-L6-v2`):

1. **In `.env`:**
   ```env
   MEM0_ENABLED=true
   MEM0_EMBEDDER_BASE_URL=https://your-embedding-endpoint.aws.com/v1
   MEM0_EMBEDDER_MODEL=your-embedding-model-name
   MEM0_EMBEDDING_DIMS=384
   ```
   For **all-MiniLM-L6-v2** use `MEM0_EMBEDDING_DIMS=384`. Use the model name your endpoint expects for `MEM0_EMBEDDER_MODEL`.

2. If the endpoint requires auth:
   ```env
   MEM0_CUSTOM_API_KEY=your-api-key
   ```

**Note:** The Mem0 Node SDK in this project may not pass `baseURL` through to the OpenAI embedder in all versions. If embeddings still hit OpenAI’s API, try upgrading `mem0ai` or use **Option A (Ollama)** for a reliable self-hosted path.

---

## 4. Summary: minimal AWS testing setup

- **Qdrant:** Already configured (local Docker or Qdrant Cloud).
- **LLM:** Set `MEM0_LLM_BASE_URL` + `MEM0_LLM_MODEL` (and optionally `MEM0_CUSTOM_API_KEY`).
- **Embeddings:** Set `MEM0_OLLAMA_EMBEDDER_URL` (and optionally `MEM0_OLLAMA_EMBEDDER_MODEL`), with `MEM0_EMBEDDING_DIMS=768` for `nomic-embed-text`.

No Gemini or OpenAI keys are required when using your own LLM and Ollama embedder. For an OpenAI-compatible embedding API, use `MEM0_EMBEDDER_BASE_URL` and matching `MEM0_EMBEDDING_DIMS` (e.g. 384 for all-MiniLM-L6-v2).
