import type { Persona, Rating, Visibility } from '@prisma/client';

// ============================================
// Request/Response DTOs
// ============================================

export interface CreatePersonaInput {
  name: string;
  description?: string;
  rating?: Rating;
  visibility?: Visibility;
  avatar?: Record<string, unknown>;
  backgroundImg?: Record<string, unknown>;
  tags?: string[];
  lorebookId?: string;
}

export interface UpdatePersonaInput {
  name?: string;
  description?: string | null;
  rating?: Rating;
  visibility?: Visibility;
  avatar?: Record<string, unknown> | null;
  backgroundImg?: Record<string, unknown> | null;
  tags?: string[];
  lorebookId?: string | null;
  isFavourite?: boolean;
  isSaved?: boolean;
}

export interface PersonaQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  rating?: Rating;
  visibility?: Visibility;
  tags?: string[];
  excludeTags?: string[];
  isFavourite?: boolean;
  isSaved?: boolean;
  sortBy?: 'createdAt' | 'updatedAt' | 'name';
  sortOrder?: 'asc' | 'desc';
}

// ============================================
// Response Types
// ============================================

export interface PersonaResponse {
  persona: Persona & {
    characters?: Array<{ id: string; name: string }>;
    lorebook?: { id: string; name: string } | null;
  };
}

export interface PersonaListResponse {
  personas: Persona[];
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

export interface CreatePersonaData {
  userId: string;
  name: string;
  slug: string;
  description?: string | null;
  rating: Rating;
  visibility: Visibility;
  avatar?: Record<string, unknown> | null;
  backgroundImg?: Record<string, unknown> | null;
  tags: string[];
  lorebookId?: string | null;
}

export interface UpdatePersonaData {
  name?: string;
  slug?: string;
  description?: string | null;
  rating?: Rating;
  visibility?: Visibility;
  avatar?: Record<string, unknown> | null;
  backgroundImg?: Record<string, unknown> | null;
  tags?: string[];
  lorebookId?: string | null;
  isFavourite?: boolean;
  isSaved?: boolean;
}
