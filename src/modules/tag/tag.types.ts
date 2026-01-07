import type { Tag, Rating } from '@prisma/client';

// ============================================
// Tag Input Types
// ============================================

export interface CreateTagInput {
    name: string;
    category: Rating; // SFW or NSFW
    description?: string;
}

export interface UpdateTagInput {
    name?: string;
    category?: Rating;
    description?: string;
}

export interface TagQueryParams {
    page?: number;
    limit?: number;
    search?: string;
    category?: Rating;
    sortBy?: 'name' | 'usageCount' | 'createdAt';
    sortOrder?: 'asc' | 'desc';
}

// ============================================
// Tag Response Types
// ============================================

export interface TagResponse {
    tag: Tag;
}

export interface TagListResponse {
    tags: Tag[];
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
// Tag Data Types (for repository)
// ============================================

export interface CreateTagData {
    name: string;
    category: Rating;
    description?: string | null;
}

export interface UpdateTagData {
    name?: string;
    category?: Rating;
    description?: string | null;
}

