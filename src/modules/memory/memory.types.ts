/**
 * Advanced memory module types.
 * Supports multi-scope memory: global (user-wide), character-specific, chat-specific.
 */

export type MemoryScope = 'global' | 'character' | 'chat';

export interface MemoryAddInput {
  userId: string;
  chatId: string;
  characterId?: string | null;
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
}

export interface MemorySearchInput {
  userId: string;
  chatId: string;
  characterId?: string | null;
  query: string;
  limit?: number;
  scopes?: MemoryScope[];
}

export interface MemorySearchResult {
  memory: string;
  score: number;
  scope: MemoryScope;
  metadata?: Record<string, unknown>;
}

export interface MemoryContext {
  systemPrompt: string;
  memories: MemorySearchResult[];
  stats: {
    totalRetrieved: number;
    byScope: Record<MemoryScope, number>;
  };
}

export interface MemoryStats {
  totalMemories: number;
  globalMemories: number;
  characterMemories: number;
  chatMemories: number;
}
