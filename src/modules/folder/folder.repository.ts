import { prisma } from '../../lib/prisma.js';

import type { Folder, FolderWithCount, CreateFolderData, UpdateFolderData, FolderQueryParams } from './folder.types.js';

// ============================================
// Folder Repository
// ============================================

export const folderRepository = {
  // ============================================
  // Folder Operations
  // ============================================

  async findFolderById(id: string): Promise<FolderWithCount | null> {
    return prisma.folder.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            chats: true,
          },
        },
      },
    });
  },

  async findFoldersByUser(
    userId: string,
    params: FolderQueryParams
  ): Promise<{ folders: FolderWithCount[]; total: number }> {
    const {
      page = 1,
      limit = 20,
      search,
      sortBy = 'updatedAt',
      sortOrder = 'desc',
    } = params;

    // If limit is 0, fetch all folders (no pagination)
    const skip = limit === 0 ? undefined : (page - 1) * limit;
    const take = limit === 0 ? undefined : limit;

    // Build where clause
    const where: {
      userId: string;
      OR?: Array<{
        name?: { contains: string; mode: 'insensitive' };
        description?: { contains: string; mode: 'insensitive' };
      }>;
    } = {
      userId,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Build orderBy clause
    const orderBy: Record<string, 'asc' | 'desc'> = {};
    orderBy[sortBy] = sortOrder;

    const [folders, total] = await Promise.all([
      prisma.folder.findMany({
        where,
        ...(skip !== undefined && { skip }),
        ...(take !== undefined && { take }),
        orderBy,
        include: {
          _count: {
            select: {
              chats: true,
            },
          },
        },
      }),
      prisma.folder.count({ where }),
    ]);

    return { folders, total };
  },

  async createFolder(data: CreateFolderData): Promise<FolderWithCount> {
    return prisma.folder.create({
      data: {
        userId: data.userId,
        name: data.name,
        description: data.description ?? null,
        color: data.color ?? null,
      },
      include: {
        _count: {
          select: {
            chats: true,
          },
        },
      },
    });
  },

  async updateFolder(id: string, data: UpdateFolderData): Promise<FolderWithCount> {
    return prisma.folder.update({
      where: { id },
      data: {
        name: data.name ?? undefined,
        description: data.description ?? undefined,
        color: data.color ?? undefined,
      },
      include: {
        _count: {
          select: {
            chats: true,
          },
        },
      },
    });
  },

  async deleteFolder(id: string): Promise<void> {
    await prisma.folder.delete({
      where: { id },
    });
  },

  async findFolderByIdAndUser(id: string, userId: string): Promise<FolderWithCount | null> {
    return prisma.folder.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        _count: {
          select: {
            chats: true,
          },
        },
      },
    });
  },
};
