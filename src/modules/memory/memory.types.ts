/**
 * Memory module types
 * Entity partitioning: userId + chatId for multi-tenant isolation
 */

export interface MemoryAddInput {
  userId: string;
  chatId: string;
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
}

export interface MemorySearchInput {
  userId: string;
  chatId: string;
  query: string;
  limit?: number;
}

export interface MemorySearchResult {
  memory: string;
  score: number;
  metadata?: Record<string, unknown>;
}

export interface MemoryContext {
  /** Formatted string for system prompt injection */
  systemPrompt: string;
  /** Raw memories for logging/debugging */
  memories: MemorySearchResult[];
}
