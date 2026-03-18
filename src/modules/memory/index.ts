export {
  addMemories,
  searchMemories,
  getAllMemories,
  deleteMemory,
  pruneMemories,
  getMemoryStats,
  isMemoryEnabled,
  resetMemoryClient,
} from './memory.service.js';

export type {
  MemoryAddInput,
  MemorySearchInput,
  MemoryContext,
  MemorySearchResult,
  MemoryScope,
  MemoryStats,
} from './memory.types.js';
