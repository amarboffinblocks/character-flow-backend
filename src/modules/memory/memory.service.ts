import { config } from '../../config/index.js';
import { logger } from '../../lib/logger.js';
import type {
  MemoryAddInput,
  MemoryContext,
  MemorySearchInput,
  MemoryScope,
  MemorySearchResult,
  MemoryStats,
} from './memory.types.js';

type Mem0Client = InstanceType<typeof import('mem0ai/oss').Memory>;

let client: Mem0Client | null = null;

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

function isMemoryConfigured(): boolean {
  const { memory } = config;
  if (!memory.enabled) return false;
  const hasVectorStore = !!(memory.qdrant.url || (memory.qdrant.host && memory.qdrant.port));
  return hasVectorStore && !!process.env.GEMINI_API_KEY;
}

async function getClient(): Promise<Mem0Client> {
  if (client) return client;

  const { Memory } = await import('mem0ai/oss');
  const { memory } = config;
  const geminiKey = process.env.GEMINI_API_KEY!;

  const qdrantConnection = memory.qdrant.url
    ? { url: memory.qdrant.url }
    : { host: memory.qdrant.host, port: memory.qdrant.port };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client = new Memory({
    version: 'v1.1',
    embedder: {
      provider: 'google',
      config: {
        apiKey: geminiKey,
        model: 'gemini-embedding-001',
        embeddingDims: memory.embeddingDims,
      },
    },
    vectorStore: {
      provider: 'qdrant',
      config: {
        collectionName: memory.collectionName,
        dimension: memory.embeddingDims,
        ...qdrantConnection,
        ...(memory.qdrant.apiKey && { apiKey: memory.qdrant.apiKey }),
      },
    },
    llm: {
      provider: 'google',
      config: {
        apiKey: geminiKey,
        model: 'gemini-2.5-flash',
      },
    },
    disableHistory: true,
  } as any);

  logger.info(
    { collection: memory.collectionName, embedder: 'gemini-embedding-001', llm: 'gemini-2.5-flash' },
    'Mem0 client initialized',
  );

  return client;
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

/**
 * Exponential time-decay so older memories rank lower.
 * Default decay ~1% drop after 20 hours.
 */
function applyTimeDecay(score: number, timestamp?: string | Date): number {
  if (!timestamp) return score;
  const hoursOld = (Date.now() - new Date(timestamp).getTime()) / 3_600_000;
  return hoursOld > 0 ? score * Math.exp(-config.memory.timeDecayFactor * hoursOld) : score;
}

// ---------------------------------------------------------------------------
// Add memories
// ---------------------------------------------------------------------------

export async function addMemories(input: MemoryAddInput): Promise<void> {
  if (!isMemoryConfigured()) return;

  try {
    const mem = await getClient();
    await mem.add(
      input.messages.map(({ role, content }) => ({ role, content })),
      {
        userId: input.userId,
        metadata: {
          chatId: input.chatId,
          ...(input.characterId && { characterId: input.characterId }),
          timestamp: new Date().toISOString(),
          source: 'chat',
        },
      },
    );

    logger.debug(
      { userId: input.userId, chatId: input.chatId, count: input.messages.length },
      'Memories added',
    );
  } catch (err) {
    logger.error({ err, userId: input.userId, chatId: input.chatId }, 'Failed to add memories');
  }
}

// ---------------------------------------------------------------------------
// Search memories (multi-scope, deduplicated, time-decayed)
// ---------------------------------------------------------------------------

const EMPTY_CONTEXT: MemoryContext = {
  systemPrompt: '',
  memories: [],
  stats: { totalRetrieved: 0, byScope: { global: 0, character: 0, chat: 0 } },
};

export async function searchMemories(input: MemorySearchInput): Promise<MemoryContext> {
  if (!isMemoryConfigured()) return EMPTY_CONTEXT;

  try {
    const mem = await getClient();
    const scopes: MemoryScope[] =
      input.scopes ?? (input.characterId ? ['chat', 'character', 'global'] : ['chat', 'global']);
    const perScope = Math.max(3, Math.ceil((input.limit ?? 10) / scopes.length));

    const settled = await Promise.allSettled(
      scopes.map(async (scope) => {
        const filters: Record<string, unknown> = {};
        if (scope === 'chat') filters.chatId = input.chatId;
        if (scope === 'character' && input.characterId) filters.characterId = input.characterId;

        const res = await mem.search(input.query, { userId: input.userId, filters, limit: perScope });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return ((res as any)?.results ?? []).map((r: any): MemorySearchResult => ({
          memory: r.memory ?? '',
          score: applyTimeDecay(r.score ?? 0, r.created_at ?? r.metadata?.timestamp),
          scope,
          metadata: r.metadata,
        }));
      }),
    );

    const seen = new Set<string>();
    const byScope: Record<MemoryScope, number> = { global: 0, character: 0, chat: 0 };
    const merged: MemorySearchResult[] = [];

    for (const result of settled) {
      if (result.status !== 'fulfilled') continue;
      for (const m of result.value as MemorySearchResult[]) {
        const key = m.memory.trim().toLowerCase();
        if (seen.has(key) || m.score < config.memory.scoreThreshold) continue;
        seen.add(key);
        merged.push(m);
        byScope[m.scope]++;
      }
    }

    merged.sort((a, b) => b.score - a.score);
    const top = merged.slice(0, input.limit ?? 10);

    if (top.length === 0) return EMPTY_CONTEXT;

    return {
      systemPrompt: buildPrompt(top),
      memories: top,
      stats: { totalRetrieved: top.length, byScope },
    };
  } catch (err) {
    logger.error({ err, userId: input.userId, chatId: input.chatId }, 'Failed to search memories');
    return EMPTY_CONTEXT;
  }
}

// ---------------------------------------------------------------------------
// Prompt builder
// ---------------------------------------------------------------------------

const SCOPE_LABELS: Record<MemoryScope, string> = {
  chat: '**Current conversation context:**',
  character: '**Character interaction history:**',
  global: '**User preferences & background:**',
};

function buildPrompt(memories: MemorySearchResult[]): string {
  const scopes: MemoryScope[] = ['chat', 'character', 'global'];
  return scopes
    .map((scope) => {
      const items = memories.filter((m) => m.scope === scope);
      if (items.length === 0) return null;
      return [SCOPE_LABELS[scope], ...items.map((m) => `- ${m.memory}`)].join('\n');
    })
    .filter(Boolean)
    .join('\n');
}

// ---------------------------------------------------------------------------
// Get all memories
// ---------------------------------------------------------------------------

export async function getAllMemories(
  userId: string,
  options?: { characterId?: string; chatId?: string; limit?: number },
): Promise<MemorySearchResult[]> {
  if (!isMemoryConfigured()) return [];

  try {
    const mem = await getClient();
    const res = await mem.getAll({ userId, ...(options?.limit && { limit: options.limit }) });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw: any[] = (res as any)?.results ?? res ?? [];

    return raw
      .map((r) => ({
        memory: r.memory ?? '',
        score: r.score ?? 1,
        scope: (r.metadata?.scope as MemoryScope) ?? 'global',
        metadata: { ...r.metadata, _id: r.id },
      }))
      .filter((m) => {
        if (options?.characterId && m.metadata?.characterId !== options.characterId) return false;
        if (options?.chatId && m.metadata?.chatId !== options.chatId) return false;
        return true;
      });
  } catch (err) {
    logger.error({ err, userId }, 'Failed to get all memories');
    return [];
  }
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

export async function deleteMemory(memoryId: string): Promise<boolean> {
  if (!isMemoryConfigured()) return false;
  try {
    const mem = await getClient();
    await mem.delete(memoryId);
    logger.info({ memoryId }, 'Memory deleted');
    return true;
  } catch (err) {
    logger.error({ err, memoryId }, 'Failed to delete memory');
    return false;
  }
}

// ---------------------------------------------------------------------------
// Prune stale / low-relevance memories
// ---------------------------------------------------------------------------

export async function pruneMemories(
  userId: string,
  options?: { maxAgeDays?: number; minScore?: number; dryRun?: boolean },
): Promise<{ pruned: number; total: number }> {
  if (!isMemoryConfigured()) return { pruned: 0, total: 0 };

  try {
    const all = await getAllMemories(userId);
    const maxAgeMs = (options?.maxAgeDays ?? config.memory.maxAgeDays) * 86_400_000;
    const minScore = options?.minScore ?? config.memory.scoreThreshold;
    const now = Date.now();

    const stale = all.filter((m) => {
      const ts = m.metadata?.timestamp as string | undefined;
      if (ts && now - new Date(ts).getTime() > maxAgeMs) return true;
      return m.score < minScore;
    });

    if (!options?.dryRun) {
      const mem = await getClient();
      const deletable = stale
        .map((m) => m.metadata?._id as string | undefined)
        .filter(Boolean) as string[];

      await Promise.allSettled(deletable.map((id) => mem.delete(id)));
    }

    logger.info(
      { userId, pruned: stale.length, total: all.length, dryRun: !!options?.dryRun },
      'Memory pruning completed',
    );
    return { pruned: stale.length, total: all.length };
  } catch (err) {
    logger.error({ err, userId }, 'Failed to prune memories');
    return { pruned: 0, total: 0 };
  }
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

export async function getMemoryStats(userId: string): Promise<MemoryStats> {
  const zero: MemoryStats = { totalMemories: 0, globalMemories: 0, characterMemories: 0, chatMemories: 0 };
  if (!isMemoryConfigured()) return zero;

  try {
    const all = await getAllMemories(userId);
    return {
      totalMemories: all.length,
      globalMemories: all.filter((m) => m.scope === 'global').length,
      characterMemories: all.filter((m) => m.scope === 'character').length,
      chatMemories: all.filter((m) => m.scope === 'chat').length,
    };
  } catch (err) {
    logger.error({ err, userId }, 'Failed to get memory stats');
    return zero;
  }
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

export function isMemoryEnabled(): boolean {
  return isMemoryConfigured();
}

export function resetMemoryClient(): void {
  client = null;
}
