import type { Background, Rating } from '@prisma/client';

// ============================================
// Request/Response DTOs
// ============================================

export interface BackgroundImage {
  url: string;
  width?: number;
  height?: number;
}

export interface CreateBackgroundInput {
  name?: string;
  description?: string;
  image: BackgroundImage;
  tags?: string[];
  rating?: Rating;
}

export interface UpdateBackgroundInput {
  name?: string;
  description?: string | null;
  tags?: string[];
  rating?: Rating;
  characterId?: string | null;
  personaId?: string | null;
  realmId?: string | null;
}

export interface BackgroundQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  tags?: string[];
  excludeTags?: string[];
  rating?: Rating;
  linkedTo?: 'character' | 'persona' | 'realm';
  isGlobalDefault?: boolean;
  characterId?: string;
  personaId?: string;
  realmId?: string;
  sort?: 'date' | 'name';
  order?: 'asc' | 'desc';
}

// ============================================
// Response Types
// ============================================

export interface BackgroundResponse {
  background: Background;
}

export interface BackgroundListResponse {
  backgrounds: Background[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============================================
// Internal Types
// ============================================

export interface CreateBackgroundData {
  userId: string;
  name?: string | null;
  description?: string | null;
  image: BackgroundImage;
  tags: string[];
  rating: Rating;
}

export interface UpdateBackgroundData {
  name?: string | null;
  description?: string | null;
  tags?: string[];
  rating?: Rating;
  characterId?: string | null;
  personaId?: string | null;
  realmId?: string | null;
}
