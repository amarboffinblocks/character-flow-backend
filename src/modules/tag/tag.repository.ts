import { prisma } from '../../lib/prisma.js';
import type { Tag, Rating } from '@prisma/client';
import { Prisma } from '@prisma/client';
import type { CreateTagData, UpdateTagData, TagQueryParams } from './tag.types.js';

// ============================================
// Tag Repository
// ============================================

export const tagRepository = {
  // ============================================
  // Tag Operations
  // ============================================

  async findTagById(id: string): Promise<Tag | null> {
    return prisma.tag.findUnique({
      where: { id },
    });
  },

  async findTagByName(name: string): Promise<Tag | null> {
    return prisma.tag.findUnique({
      where: { name: name.toLowerCase() },
    });
  },

  async findTags(params: TagQueryParams): Promise<{ tags: Tag[]; total: number }> {
    const {
      page = 1,
      limit = 20,
      search,
      category,
      sortBy = 'name',
      sortOrder = 'asc',
    } = params;

    // Build where clause
    const where: Prisma.TagWhereInput = {};

    if (search) {
      where.name = {
        contains: search.toLowerCase(),
        mode: 'insensitive',
      };
    }

    if (category) {
      where.category = category;
    }

    // Build orderBy
    const orderBy: Prisma.TagOrderByWithRelationInput = {};
    if (sortBy === 'usageCount') {
      orderBy.usageCount = sortOrder;
    } else if (sortBy === 'createdAt') {
      orderBy.createdAt = sortOrder;
    } else {
      orderBy.name = sortOrder;
    }

    // Calculate skip
    const skip = limit > 0 ? (page - 1) * limit : undefined;
    const take = limit > 0 ? limit : undefined;

    // Execute queries
    const [tags, total] = await Promise.all([
      prisma.tag.findMany({
        where,
        orderBy,
        skip,
        take,
      }),
      prisma.tag.count({ where }),
    ]);

    return { tags, total };
  },

  async createTag(data: CreateTagData): Promise<Tag> {
    return prisma.tag.create({
      data: {
        name: data.name.toLowerCase(),
        category: data.category,
        description: data.description,
      },
    });
  },

  async updateTag(id: string, data: UpdateTagData): Promise<Tag> {
    const updateData: Prisma.TagUpdateInput = {};

    if (data.name !== undefined) {
      updateData.name = data.name.toLowerCase();
    }

    if (data.category !== undefined) {
      updateData.category = data.category;
    }

    if (data.description !== undefined) {
      updateData.description = data.description;
    }

    return prisma.tag.update({
      where: { id },
      data: updateData,
    });
  },

  async deleteTag(id: string): Promise<void> {
    await prisma.tag.delete({
      where: { id },
    });
  },

  async incrementUsageCount(name: string): Promise<void> {
    await prisma.tag.updateMany({
      where: { name: name.toLowerCase() },
      data: {
        usageCount: {
          increment: 1,
        },
      },
    });
  },

  async decrementUsageCount(name: string): Promise<void> {
    await prisma.tag.updateMany({
      where: {
        name: name.toLowerCase(),
        usageCount: {
          gt: 0,
        },
      },
      data: {
        usageCount: {
          decrement: 1,
        },
      },
    });
  },

  async findTagsByNames(names: string[]): Promise<Tag[]> {
    const normalizedNames = names.map((name) => name.toLowerCase());
    return prisma.tag.findMany({
      where: {
        name: {
          in: normalizedNames,
        },
      },
    });
  },

  async getPopularTags(limit: number = 10, category?: Rating): Promise<Tag[]> {
    const where: Prisma.TagWhereInput = category ? { category } : {};
    
    return prisma.tag.findMany({
      where,
      orderBy: {
        usageCount: 'desc',
      },
      take: limit,
    });
  },
};

