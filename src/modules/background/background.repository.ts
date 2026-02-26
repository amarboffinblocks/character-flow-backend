import { prisma } from '../../lib/prisma.js';
import type { Background, Rating } from '@prisma/client';
import { Prisma } from '@prisma/client';
import type { CreateBackgroundData, UpdateBackgroundData, BackgroundQueryParams } from './background.types.js';

// ============================================
// Background Repository
// ============================================

export const backgroundRepository = {
  async findById(id: string): Promise<Background | null> {
    return prisma.background.findUnique({
      where: { id },
    });
  },

  async findByUser(
    userId: string,
    params: BackgroundQueryParams
  ): Promise<{ backgrounds: Background[]; total: number }> {
    const {
      page = 1,
      limit = 20,
      search,
      rating,
      tags,
      excludeTags,
      linkedTo,
      sort = 'date',
      order = 'desc',
    } = params;

    const skip = (page - 1) * limit;
    const take = limit;

    const where: Prisma.BackgroundWhereInput = {
      userId,
    };

    if (rating) {
      where.rating = rating as Rating;
    }

    if (tags && tags.length > 0) {
      where.tags = { hasEvery: tags };
    }

    if (excludeTags && excludeTags.length > 0) {
      where.NOT = [{ tags: { hasSome: excludeTags } }];
    }

    if (linkedTo) {
      if (linkedTo === 'character') where.characterId = { not: null };
      if (linkedTo === 'persona') where.personaId = { not: null };
      if (linkedTo === 'realm') where.realmId = { not: null };
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const sortField = sort === 'date' ? 'createdAt' : 'name';
    const orderBy = { [sortField]: order };

    const [backgrounds, total] = await Promise.all([
      prisma.background.findMany({
        where,
        skip,
        take,
        orderBy,
      }),
      prisma.background.count({ where }),
    ]);

    return { backgrounds, total };
  },

  async create(data: CreateBackgroundData): Promise<Background> {
    return prisma.background.create({
      data: {
        userId: data.userId,
        name: data.name ?? null,
        description: data.description ?? null,
        image: data.image as unknown as Prisma.InputJsonValue,
        tags: data.tags,
        rating: data.rating,
      },
    });
  },

  async update(id: string, data: UpdateBackgroundData): Promise<Background> {
    const updateData: Prisma.BackgroundUpdateInput = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.tags !== undefined) updateData.tags = data.tags;
    if (data.rating !== undefined) updateData.rating = data.rating;

    return prisma.background.update({
      where: { id },
      data: updateData,
    });
  },

  async delete(id: string): Promise<void> {
    await prisma.background.delete({
      where: { id },
    });
  },

  async setGlobalDefault(userId: string, id: string): Promise<Background> {
    await prisma.background.updateMany({
      where: { userId },
      data: { isGlobalDefault: false },
    });

    return prisma.background.update({
      where: { id },
      data: { isGlobalDefault: true },
    });
  },
};
