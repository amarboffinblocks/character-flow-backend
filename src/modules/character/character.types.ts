import type { Character, Rating, Visibility } from '@prisma/client';

// ============================================
// Request/Response DTOs
// ============================================

export interface CreateCharacterInput {
  name: string;
  description?: string;
  scenario?: string;
  summary?: string;
  rating?: Rating;
  visibility?: Visibility;
  avatar?: Record<string, unknown>;
  backgroundImg?: Record<string, unknown>;
  tags?: string[];
  firstMessage?: string;
  alternateMessages?: string[];
  exampleDialogues?: string[];
  authorNotes?: string;
  characterNotes?: string;
  authorName?: string;
  personaId?: string;
  lorebookId?: string;
  realmId?: string;
  tokens?: number;
}

export interface UpdateCharacterInput {
  name?: string;
  description?: string | null;
  scenario?: string | null;
  summary?: string | null;
  rating?: Rating;
  visibility?: Visibility;
  avatar?: Record<string, unknown> | null;
  backgroundImg?: Record<string, unknown> | null;
  tags?: string[];
  firstMessage?: string | null;
  alternateMessages?: string[];
  exampleDialogues?: string[];
  authorNotes?: string | null;
  characterNotes?: string | null;
  authorName?: string | null;
  personaId?: string | null;
  lorebookId?: string | null;
  realmId?: string | null;
  isFavourite?: boolean;
  isSaved?: boolean;
  tokens?: number | null;
}

export interface CharacterQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  rating?: Rating;
  visibility?: Visibility;
  tags?: string[];
  excludeTags?: string[];
  isFavourite?: boolean;
  isSaved?: boolean;
  sortBy?: 'createdAt' | 'updatedAt' | 'name' | 'chatCount';
  sortOrder?: 'asc' | 'desc';
}

// ============================================
// Response Types
// ============================================

export interface CharacterResponse {
  character: Character;
}

export interface CharacterListResponse {
  characters: Character[];
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

export interface CreateCharacterData {
  userId: string;
  name: string;
  slug: string;
  description?: string | null;
  scenario?: string | null;
  summary?: string | null;
  rating: Rating;
  visibility: Visibility;
  avatar?: Record<string, unknown> | null;
  backgroundImg?: Record<string, unknown> | null;
  tags: string[];
  firstMessage?: string | null;
  alternateMessages: string[];
  exampleDialogues: string[];
  authorNotes?: string | null;
  characterNotes?: string | null;
  authorName?: string | null;
  personaId?: string | null;
  lorebookId?: string | null;
  realmId?: string | null;
  tokens?: number | null;
}

export interface UpdateCharacterData {
  name?: string;
  slug?: string;
  description?: string | null;
  scenario?: string | null;
  summary?: string | null;
  rating?: Rating;
  visibility?: Visibility;
  avatar?: Record<string, unknown> | null;
  backgroundImg?: Record<string, unknown> | null;
  tags?: string[];
  firstMessage?: string | null;
  alternateMessages?: string[];
  exampleDialogues?: string[];
  authorNotes?: string | null;
  characterNotes?: string | null;
  authorName?: string | null;
  personaId?: string | null;
  lorebookId?: string | null;
  realmId?: string | null;
  isFavourite?: boolean;
  isSaved?: boolean;
  tokens?: number | null;
}

