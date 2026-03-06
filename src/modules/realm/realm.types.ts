import type { Realm, Rating, Visibility } from '@prisma/client';
import { Prisma } from '@prisma/client';

// ============================================
// Request/Response DTOs
// ============================================

export interface CreateRealmInput {
    name: string;
    description?: string | null;
    tags?: string[];
    rating?: Rating;
    visibility?: Visibility;
    avatar?: Record<string, unknown> | null;
    characterIds?: string[];
}

export interface UpdateRealmInput {
    name?: string;
    description?: string | null;
    tags?: string[];
    rating?: Rating;
    visibility?: Visibility;
    avatar?: Record<string, unknown> | null;
    isFavourite?: boolean;
    characterIds?: string[];
}

export interface RealmQueryParams {
    page?: number;
    limit?: number;
    search?: string;
    rating?: Rating;
    visibility?: Visibility;
    tags?: string[];
    isFavourite?: boolean;
    sortBy?: 'createdAt' | 'updatedAt' | 'name';
    sortOrder?: 'asc' | 'desc';
}

// ============================================
// Response Types
// ============================================

export interface RealmResponse {
    realm: Realm & {
        characters?: any[];
    };
}

export interface RealmListResponse {
    realms: any[];
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

export interface CreateRealmData {
    userId: string;
    name: string;
    slug: string;
    description?: string | null;
    tags: string[];
    rating: Rating;
    visibility: Visibility;
    avatar?: Record<string, unknown> | null;
    characterIds?: string[];
}

export interface UpdateRealmData {
    name?: string;
    slug?: string;
    description?: string | null;
    tags?: string[];
    rating?: Rating;
    visibility?: Visibility;
    avatar?: Record<string, unknown> | null;
    isFavourite?: boolean;
    characterIds?: string[];
}
