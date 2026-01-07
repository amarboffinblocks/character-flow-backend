import type { Lorebook, LorebookEntry, Rating, Visibility } from '@prisma/client';

// ============================================
// Request/Response DTOs
// ============================================

export interface CreateLorebookInput {
  name: string;
  description?: string;
  rating?: Rating;
  visibility?: Visibility;
  avatar?: Record<string, unknown>;
  tags?: string[];
  entries?: CreateLorebookEntryInput[];
}

export interface CreateLorebookEntryInput {
  keyword: string;
  context: string;
  isEnabled?: boolean;
  priority?: number;
}

export interface UpdateLorebookInput {
  name?: string;
  description?: string | null;
  rating?: Rating;
  visibility?: Visibility;
  avatar?: Record<string, unknown> | null;
  tags?: string[];
  isFavourite?: boolean;
  isSaved?: boolean;
}

export interface UpdateLorebookEntryInput {
  keyword?: string;
  context?: string;
  isEnabled?: boolean;
  priority?: number;
}

export interface LorebookQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  rating?: Rating;
  visibility?: Visibility;
  tags?: string[];
  isFavourite?: boolean;
  isSaved?: boolean;
  sortBy?: 'createdAt' | 'updatedAt' | 'name';
  sortOrder?: 'asc' | 'desc';
}

// ============================================
// Response Types
// ============================================

export interface LorebookResponse {
  lorebook: Lorebook & {
    entries?: LorebookEntry[];
    characters?: Array<{ id: string; name: string }>;
    personas?: Array<{ id: string; name: string }>;
  };
}

export interface LorebookListResponse {
  lorebooks: (Lorebook & {
    entriesCount?: number;
  })[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface LorebookEntryResponse {
  entry: LorebookEntry;
}

export interface LorebookEntryListResponse {
  entries: LorebookEntry[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface MessageResponse {
  message: string;
}

// ============================================
// Internal Types
// ============================================

export interface CreateLorebookData {
  userId: string;
  name: string;
  slug: string;
  description?: string | null;
  rating: Rating;
  visibility: Visibility;
  avatar?: Record<string, unknown> | null;
  tags: string[];
}

export interface UpdateLorebookData {
  name?: string;
  slug?: string;
  description?: string | null;
  rating?: Rating;
  visibility?: Visibility;
  avatar?: Record<string, unknown> | null;
  tags?: string[];
  isFavourite?: boolean;
  isSaved?: boolean;
}

export interface CreateLorebookEntryData {
  lorebookId: string;
  keyword: string;
  context: string;
  isEnabled: boolean;
  priority: number;
}

export interface UpdateLorebookEntryData {
  keyword?: string;
  context?: string;
  isEnabled?: boolean;
  priority?: number;
}

