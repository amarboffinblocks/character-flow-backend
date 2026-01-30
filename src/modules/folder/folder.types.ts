import { prisma } from '../../lib/prisma.js';

// Base Folder type (without _count)
export type Folder = NonNullable<Awaited<ReturnType<typeof prisma.folder.findFirst<{}>>>>;

// Folder with count type
export type FolderWithCount = Folder & { _count: { chats: number } };

// ============================================
// Request/Response DTOs
// ============================================

export interface CreateFolderInput {
  name: string;
  description?: string;
  color?: string;
}

export interface UpdateFolderInput {
  name?: string;
  description?: string | null;
  color?: string | null;
}

export interface FolderQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'name';
  sortOrder?: 'asc' | 'desc';
}

// ============================================
// Response Types
// ============================================

export interface FolderResponse {
  folder: Folder & {
    chatCount?: number;
  };
}

export interface FolderListResponse {
  folders: (Folder & {
    chatCount?: number;
  })[];
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

export interface CreateFolderData {
  userId: string;
  name: string;
  description?: string | null;
  color?: string | null;
}

export interface UpdateFolderData {
  name?: string;
  description?: string | null;
  color?: string | null;
}
