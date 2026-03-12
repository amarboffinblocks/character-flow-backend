import { prisma } from '../../lib/prisma.js';
import type { Lorebook, LorebookEntry, Rating, Visibility, Prisma } from '@prisma/client';
import type {
  CreateLorebookData,
  UpdateLorebookData,
  LorebookQueryParams,
  CreateLorebookEntryData,
  UpdateLorebookEntryData,
} from './lorebook.types.js';

// ============================================
// Lorebook Repository
// ============================================

export const lorebookRepository = {
  // ============================================
  // Lorebook Operations
  // ============================================

  async findLorebookById(id: string): Promise<Lorebook | null> {
    const lorebook = await prisma.lorebook.findUnique({
      where: { id },
      include: {
        entries: {
          orderBy: [
            { priority: 'asc' },
            { createdAt: 'asc' },
          ],
        },
        _count: {
          select: {
            entries: true,
          },
        },
        characters: {
          select: {
            id: true,
            name: true,
          },
        },
        personas: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!lorebook) return null;

    const { _count, ...lorebookData } = lorebook as any;
    return {
      ...lorebookData,
      entriesCount: _count?.entries ?? 0,
    } as Lorebook;
  },

  async findLorebookBySlug(slug: string): Promise<Lorebook | null> {
    const lorebook = await prisma.lorebook.findUnique({
      where: { slug },
      include: {
        entries: {
          orderBy: [
            { priority: 'asc' },
            { createdAt: 'asc' },
          ],
        },
        _count: {
          select: {
            entries: true,
          },
        },
        characters: {
          select: {
            id: true,
            name: true,
          },
        },
        personas: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!lorebook) return null;

    const { _count, ...lorebookData } = lorebook as any;
    return {
      ...lorebookData,
      entriesCount: _count?.entries ?? 0,
    } as Lorebook;
  },

  async findLorebookBySlugAndUser(slug: string, userId: string): Promise<Lorebook | null> {
    const lorebook = await prisma.lorebook.findFirst({
      where: {
        slug,
        userId,
      },
      include: {
        entries: {
          orderBy: [
            { priority: 'asc' },
            { createdAt: 'asc' },
          ],
        },
        _count: {
          select: {
            entries: true,
          },
        },
      },
    });

    if (!lorebook) return null;

    const { _count, ...lorebookData } = lorebook as any;
    return {
      ...lorebookData,
      entriesCount: _count?.entries ?? 0,
    } as Lorebook;
  },

  async findLorebooksByUser(
    userId: string,
    params: LorebookQueryParams
  ): Promise<{ lorebooks: Lorebook[]; total: number }> {
    const {
      page = 1,
      limit = 20,
      search,
      rating,
      visibility,
      tags,
      excludeTags,
      isFavourite,
      isSaved,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = params;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: {
      userId: string;
      rating?: Rating;
      visibility?: Visibility;
      isFavourite?: boolean;
      isSaved?: boolean;
      tags?: { hasEvery: string[] };
      NOT?: Array<{
        tags?: { hasSome: string[] };
      }>;
      OR?: Array<{
        name?: { contains: string; mode: 'insensitive' };
        description?: { contains: string; mode: 'insensitive' };
      }>;
    } = {
      userId,
    };

    if (rating) {
      where.rating = rating;
    }

    if (visibility) {
      where.visibility = visibility;
    }

    if (isFavourite !== undefined) {
      where.isFavourite = isFavourite;
    }

    if (isSaved !== undefined) {
      where.isSaved = isSaved;
    }

    if (tags && tags.length > 0) {
      where.tags = { hasEvery: tags };
    }

    if (excludeTags && excludeTags.length > 0) {
      // Exclude lorebooks that have any of these tags using NOT with hasSome
      where.NOT = [
        { tags: { hasSome: excludeTags } }
      ];
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Build orderBy clause
    const orderBy: Record<string, 'asc' | 'desc'> = {};
    orderBy[sortBy] = sortOrder;

    const [lorebooks, total] = await Promise.all([
      prisma.lorebook.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          _count: {
            select: {
              entries: true,
            },
          },
        },
      }),
      prisma.lorebook.count({ where }),
    ]);

    // Add entriesCount to each lorebook and remove _count
    const lorebooksWithCount = lorebooks.map((lorebook) => {
      const { _count, ...lorebookData } = lorebook as Lorebook & { _count: { entries: number } };
      return {
        ...lorebookData,
        entriesCount: _count.entries,
      };
    });

    return { lorebooks: lorebooksWithCount as Lorebook[], total };
  },

  async findPublicLorebooks(
    params: LorebookQueryParams
  ): Promise<{ lorebooks: Lorebook[]; total: number }> {
    const {
      page = 1,
      limit = 20,
      search,
      rating,
      tags,
      excludeTags,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = params;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: {
      visibility: 'public';
      rating?: Rating;
      tags?: { hasEvery: string[] };
      NOT?: Array<{
        tags?: { hasSome: string[] };
      }>;
      OR?: Array<{
        name?: { contains: string; mode: 'insensitive' };
        description?: { contains: string; mode: 'insensitive' };
      }>;
    } = {
      visibility: 'public',
    };

    if (rating) {
      where.rating = rating;
    }

    if (tags && tags.length > 0) {
      where.tags = { hasEvery: tags };
    }

    if (excludeTags && excludeTags.length > 0) {
      // Exclude lorebooks that have any of these tags using NOT with hasSome
      where.NOT = [
        { tags: { hasSome: excludeTags } }
      ];
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Build orderBy clause
    const orderBy: Record<string, 'asc' | 'desc'> = {};
    orderBy[sortBy] = sortOrder;

    const [lorebooks, total] = await Promise.all([
      prisma.lorebook.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          _count: {
            select: {
              entries: true,
            },
          },
          user: {
            select: {
              id: true,
              username: true,
              avatar: true,
            },
          },
        },
      }),
      prisma.lorebook.count({ where }),
    ]);

    // Add entriesCount to each lorebook and remove _count
    const lorebooksWithCount = lorebooks.map((lorebook) => {
      const { _count, ...lorebookData } = lorebook as Lorebook & { _count: { entries: number } };
      return {
        ...lorebookData,
        entriesCount: _count.entries,
      };
    });

    return { lorebooks: lorebooksWithCount as Lorebook[], total };
  },

  async createLorebook(data: CreateLorebookData): Promise<Lorebook> {
    return prisma.lorebook.create({
      data: {
        userId: data.userId,
        name: data.name,
        slug: data.slug,
        description: data.description,
        rating: data.rating,
        visibility: data.visibility,
        avatar: data.avatar ? (data.avatar as never) : undefined,
        tags: data.tags,
      },
      include: {
        entries: true,
      },
    });
  },

  async updateLorebook(id: string, data: UpdateLorebookData): Promise<Lorebook> {
    const updateData: Record<string, unknown> = {};

    if (data.name) updateData.name = data.name;
    if (data.slug) updateData.slug = data.slug;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.rating) updateData.rating = data.rating;
    if (data.visibility) updateData.visibility = data.visibility;
    if (data.avatar !== undefined) updateData.avatar = data.avatar ? (data.avatar as never) : null;
    if (data.tags !== undefined) updateData.tags = data.tags;
    if (data.isFavourite !== undefined) updateData.isFavourite = data.isFavourite;
    if (data.isSaved !== undefined) updateData.isSaved = data.isSaved;

    return prisma.lorebook.update({
      where: { id },
      data: updateData as never,
      include: {
        entries: {
          orderBy: [
            { priority: 'asc' },
            { createdAt: 'asc' },
          ],
        },
        characters: {
          select: {
            id: true,
            name: true,
          },
        },
        personas: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  },

  async deleteLorebook(id: string): Promise<void> {
    await prisma.lorebook.delete({
      where: { id },
    });
  },

  async checkSlugExists(slug: string, excludeId?: string): Promise<boolean> {
    const lorebook = await prisma.lorebook.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!lorebook) {
      return false;
    }

    if (excludeId && lorebook.id === excludeId) {
      return false;
    }

    return true;
  },

  // ============================================
  // Lorebook Entry Operations
  // ============================================

  async findEntryById(id: string): Promise<LorebookEntry | null> {
    return prisma.lorebookEntry.findUnique({
      where: { id },
    });
  },

  async findEntriesByLorebook(
    lorebookId: string,
    page: number = 1,
    limit: number = 50
  ): Promise<{ entries: LorebookEntry[]; total: number }> {
    const skip = (page - 1) * limit;

    const [entries, total] = await Promise.all([
      prisma.lorebookEntry.findMany({
        where: { lorebookId },
        skip,
        take: limit,
        orderBy: [
          { priority: 'asc' },
          { createdAt: 'asc' },
        ],
      }),
      prisma.lorebookEntry.count({ where: { lorebookId } }),
    ]);

    return { entries, total };
  },

  async createEntry(data: CreateLorebookEntryData): Promise<LorebookEntry> {
    return prisma.lorebookEntry.create({
      data: {
        lorebookId: data.lorebookId,
        keywords: data.keywords,
        context: data.context,
        isEnabled: data.isEnabled,
        priority: data.priority,
      } as unknown as Prisma.LorebookEntryUncheckedCreateInput,
    });
  },

  async updateEntry(id: string, data: UpdateLorebookEntryData): Promise<LorebookEntry> {
    return prisma.lorebookEntry.update({
      where: { id },
      data: {
        ...(data.keywords && { keywords: data.keywords }),
        ...(data.context && { context: data.context }),
        ...(data.isEnabled !== undefined && { isEnabled: data.isEnabled }),
        ...(data.priority !== undefined && { priority: data.priority }),
      },
    });
  },

  async deleteEntry(id: string): Promise<void> {
    await prisma.lorebookEntry.delete({
      where: { id },
    });
  },

  async createEntries(entries: CreateLorebookEntryData[]): Promise<LorebookEntry[]> {
    return prisma.lorebookEntry.createManyAndReturn({
      data: entries.map((entry) => ({
        lorebookId: entry.lorebookId,
        keywords: entry.keywords,
        context: entry.context,
        isEnabled: entry.isEnabled,
        priority: entry.priority,
      })) as unknown as Prisma.LorebookEntryCreateManyInput[],
    });
  },

  async deleteEntriesByLorebook(lorebookId: string): Promise<void> {
    await prisma.lorebookEntry.deleteMany({
      where: { lorebookId },
    });
  },
};

export default lorebookRepository;

