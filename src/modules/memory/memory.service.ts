/**
 * Mem0 Memory Service
 * Production-ready memory layer using Qdrant vector store.
 * @see https://docs.mem0.ai/open-source/node-quickstart
 * @see https://docs.mem0.ai/components/vectordbs/dbs/qdrant
 */

import { config } from '../../config/index.js';
import { logger } from '../../lib/logger.js';
import type { MemoryAddInput, MemoryContext, MemorySearchInput } from './memory.types.js';

let memoryInstance: InstanceType<typeof import('mem0ai/oss').Memory> | null = null;

function isMemoryConfigured(): boolean {
  const { memory } = config;
  if (!memory.enabled) return false;
  const hasQdrant = memory.qdrant.url || (memory.qdrant.host && memory.qdrant.port);
  const hasEmbedder = !!memory.geminiApiKey;
  return !!(hasQdrant && hasEmbedder);
}

async function getMemoryClient(): Promise<InstanceType<typeof import('mem0ai/oss').Memory>> {
  if (memoryInstance) return memoryInstance;

  const { Memory } = await import('mem0ai/oss');
  const { memory } = config;

  const memoryConfig = {
    version: 'v1.1',
    embedder: {
      provider: 'google',
      config: {
        apiKey: memory.geminiApiKey!,
        model: 'models/gemini-embedding-001',
        embeddingDims: memory.embeddingDims,
      },
    },
    vectorStore: {
      provider: 'qdrant',
      config: {
        collectionName: memory.collectionName,
        dimension: memory.embeddingDims,
        embeddingModelDims: memory.embeddingDims,
        ...(memory.qdrant.url
          ? { url: memory.qdrant.url }
          : { host: memory.qdrant.host, port: memory.qdrant.port }),
        ...(memory.qdrant.apiKey && { apiKey: memory.qdrant.apiKey }),
      },
    },
    llm: {
      provider: 'google',
      config: {
        apiKey: memory.geminiApiKey!,
        model: 'gemini-2.5-flash',
      },
    },
    disableHistory: true,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  memoryInstance = new Memory(memoryConfig as any);

  logger.info({ collection: memory.collectionName }, 'Mem0 memory client initialized');
  return memoryInstance;
}

/**
 * Add conversation messages to memory.
 * Uses userId + chatId metadata for entity partitioning.
 */
export async function addMemories(input: MemoryAddInput): Promise<void> {
  if (!isMemoryConfigured()) return;

  try {
    const memory = await getMemoryClient();
    const formatted = input.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    await memory.add(formatted, {
      userId: input.userId,
      metadata: {
        chatId: input.chatId,
        source: 'chat',
      },
    });

    logger.debug(
      { userId: input.userId, chatId: input.chatId, messageCount: formatted.length },
      'Memories added'
    );
  } catch (err) {
    logger.error(
      { err, userId: input.userId, chatId: input.chatId },
      'Failed to add memories'
    );
    // Non-fatal: chat continues without memory persistence
  }
}

/**
 * Search relevant memories for the given query.
 * Scoped by userId and chatId for context-aware retrieval.
 */
export async function searchMemories(input: MemorySearchInput): Promise<MemoryContext> {
  const emptyContext: MemoryContext = { systemPrompt: '', memories: [] };

  if (!isMemoryConfigured()) return emptyContext;

  try {
    const memory = await getMemoryClient();
    const limit = input.limit ?? 5;

    const results = await memory.search(input.query, {
      userId: input.userId,
      filters: { chatId: input.chatId },
      limit,
    });

    const rawResults = results?.results ?? [];
    const memories = rawResults.map((r: { memory?: string; score?: number; metadata?: Record<string, unknown> }) => ({
      memory: r.memory ?? '',
      score: r.score ?? 0,
      metadata: r.metadata,
    }));

    if (memories.length === 0) return emptyContext;

    const systemPrompt = [
      'Relevant context from past conversations:',
      memories.map((m) => `- ${m.memory}`).join('\n'),
    ].join('\n');

    return { systemPrompt, memories };
  } catch (err) {
    logger.error(
      { err, userId: input.userId, chatId: input.chatId },
      'Failed to search memories'
    );
    return emptyContext;
  }
}

/**
 * Check if memory is enabled and configured.
 */

export function isMemoryEnabled(): boolean {
  return isMemoryConfigured();
}
