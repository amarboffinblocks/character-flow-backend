import { prisma } from '../../lib/prisma.js';
import type { Persona, Rating, Visibility, Prisma } from '@prisma/client';
import type {
  CreatePersonaData,
  UpdatePersonaData,
  PersonaQueryParams,
} from './persona.types.js';

// ============================================
// Persona Repository
// ============================================

export const personaRepository = {
  // ============================================
  // Persona Operations
  // ============================================

  async findPersonaById(id: string): Promise<Persona | null> {
    return prisma.persona.findUnique({
      where: { id },
      include: {
        lorebook: {
          select: {
            id: true,
            name: true,
          },
        },
        characters: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  },

  async findPersonaBySlug(slug: string): Promise<Persona | null> {
    return prisma.persona.findUnique({
      where: { slug },
      include: {
        lorebook: {
          select: {
            id: true,
            name: true,
          },
        },
        characters: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  },

  async findPersonaBySlugAndUser(slug: string, userId: string): Promise<Persona | null> {
    return prisma.persona.findFirst({
      where: {
        slug,
        userId,
      },
      include: {
        lorebook: {
          select: {
            id: true,
            name: true,
          },
        },
        characters: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  },

  async findPersonasByUser(
    userId: string,
    params: PersonaQueryParams
  ): Promise<{ personas: Persona[]; total: number }> {
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

    // If limit is 0, fetch all personas (no pagination)
    const skip = limit === 0 ? undefined : (page - 1) * limit;
    const take = limit === 0 ? undefined : limit;

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
      // Exclude personas that have any of these tags using NOT with hasSome
      where.NOT = [
        {
          tags: { hasSome: excludeTags },
        },
      ];
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Build orderBy
    const orderBy: Prisma.PersonaOrderByWithRelationInput = {};
    if (sortBy === 'name') {
      orderBy.name = sortOrder;
    } else if (sortBy === 'updatedAt') {
      orderBy.updatedAt = sortOrder;
    } else {
      orderBy.createdAt = sortOrder;
    }

    const [personas, total] = await Promise.all([
      prisma.persona.findMany({
        where,
        skip,
        take,
        orderBy,
      }),
      prisma.persona.count({ where }),
    ]);

    return { personas, total };
  },

  async findPublicPersonas(
    params: PersonaQueryParams
  ): Promise<{ personas: Persona[]; total: number }> {
    const {
      page = 1,
      limit = 20,
      search,
      rating,
      tags,
      excludeTags,
      isFavourite,
      isSaved,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = params;

    // If limit is 0, fetch all personas (no pagination)
    const skip = limit === 0 ? undefined : (page - 1) * limit;
    const take = limit === 0 ? undefined : limit;

    // Build where clause
    const where: {
      visibility: 'public';
      rating?: Rating;
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
      visibility: 'public',
    };

    if (rating) {
      where.rating = rating;
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
      // Exclude personas that have any of these tags using NOT with hasSome
      where.NOT = [
        {
          tags: { hasSome: excludeTags },
        },
      ];
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Build orderBy
    const orderBy: Prisma.PersonaOrderByWithRelationInput = {};
    if (sortBy === 'name') {
      orderBy.name = sortOrder;
    } else if (sortBy === 'updatedAt') {
      orderBy.updatedAt = sortOrder;
    } else {
      orderBy.createdAt = sortOrder;
    }

    const [personas, total] = await Promise.all([
      prisma.persona.findMany({
        where,
        skip,
        take,
        orderBy,
      }),
      prisma.persona.count({ where }),
    ]);

    return { personas, total };
  },

  async checkSlugExists(slug: string): Promise<boolean> {
    const persona = await prisma.persona.findUnique({
      where: { slug },
      select: { id: true },
    });
    return !!persona;
  },

  async createPersona(data: CreatePersonaData): Promise<Persona> {
    return prisma.persona.create({
      data: {
        userId: data.userId,
        name: data.name,
        slug: data.slug,
        description: data.description,
        rating: data.rating,
        visibility: data.visibility,
        avatar: data.avatar,
        backgroundImg: data.backgroundImg,
        tags: data.tags,
        lorebookId: data.lorebookId,
      },
    });
  },

  async updatePersona(id: string, data: UpdatePersonaData): Promise<Persona> {
    return prisma.persona.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.slug && { slug: data.slug }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.rating && { rating: data.rating }),
        ...(data.visibility && { visibility: data.visibility }),
        ...(data.avatar !== undefined && { avatar: data.avatar }),
        ...(data.backgroundImg !== undefined && { backgroundImg: data.backgroundImg }),
        ...(data.tags !== undefined && { tags: data.tags }),
        ...(data.lorebookId !== undefined && { lorebookId: data.lorebookId }),
        ...(data.isFavourite !== undefined && { isFavourite: data.isFavourite }),
        ...(data.isSaved !== undefined && { isSaved: data.isSaved }),
      },
    });
  },

  async deletePersona(id: string): Promise<void> {
    await prisma.persona.delete({
      where: { id },
    });
  },

  async deletePersonas(ids: string[]): Promise<{ count: number }> {
    return prisma.persona.deleteMany({
      where: {
        id: { in: ids },
      },
    });
  },

  async toggleFavourite(id: string): Promise<Persona> {
    const persona = await prisma.persona.findUnique({
      where: { id },
      select: { isFavourite: true },
    });

    if (!persona) {
      throw new Error('Persona not found');
    }

    return prisma.persona.update({
      where: { id },
      data: { isFavourite: !persona.isFavourite },
    });
  },

  async toggleSaved(id: string): Promise<Persona> {
    const persona = await prisma.persona.findUnique({
      where: { id },
      select: { isSaved: true },
    });

    if (!persona) {
      throw new Error('Persona not found');
    }

    return prisma.persona.update({
      where: { id },
      data: { isSaved: !persona.isSaved },
    });
  },
};
