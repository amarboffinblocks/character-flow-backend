import { prisma } from '../../lib/prisma.js';
import { Prisma } from '@prisma/client';
import type { Persona, Rating, Visibility } from '@prisma/client';
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
    const where: Prisma.PersonaWhereInput = {
      userId,
    };

    if (rating) {
      where.rating = rating;
    }

    if (visibility) {
      where.visibility = visibility;
    }

    if (isFavourite !== undefined) {
      if (isFavourite) {
        where.favorites = { some: { userId } };
      } else {
        where.NOT = [
          ...(Array.isArray(where.NOT) ? where.NOT : where.NOT ? [where.NOT] : []),
          { favorites: { some: { userId } } },
        ];
      }
    }

    if (isSaved !== undefined) {
      if (isSaved) {
        where.saves = { some: { userId } };
      } else {
        where.NOT = [
          ...(Array.isArray(where.NOT) ? where.NOT : where.NOT ? [where.NOT] : []),
          { saves: { some: { userId } } },
        ];
      }
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
    params: PersonaQueryParams,
    currentUserId?: string
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
    const where: Prisma.PersonaWhereInput = {
      visibility: 'public',
    };

    if (rating) {
      where.rating = rating;
    }

    if (currentUserId && isFavourite !== undefined) {
      if (isFavourite) {
        where.favorites = { some: { userId: currentUserId } };
      } else {
        where.NOT = [
          ...(Array.isArray(where.NOT) ? where.NOT : where.NOT ? [where.NOT] : []),
          { favorites: { some: { userId: currentUserId } } },
        ];
      }
    }

    if (currentUserId && isSaved !== undefined) {
      if (isSaved) {
        where.saves = { some: { userId: currentUserId } };
      } else {
        where.NOT = [
          ...(Array.isArray(where.NOT) ? where.NOT : where.NOT ? [where.NOT] : []),
          { saves: { some: { userId: currentUserId } } },
        ];
      }
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

  async findAccessiblePersonas(
    userId: string,
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

    const skip = limit === 0 ? undefined : (page - 1) * limit;
    const take = limit === 0 ? undefined : limit;

    const where: Prisma.PersonaWhereInput = {
      OR: [{ userId }, { visibility: 'public' }],
    };

    if (rating) where.rating = rating;
    if (tags && tags.length > 0) where.tags = { hasEvery: tags };
    if (excludeTags && excludeTags.length > 0) where.NOT = [{ tags: { hasSome: excludeTags } }];
    if (search) {
      where.AND = [
        {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ],
        },
      ];
    }

    if (isFavourite !== undefined) {
      if (isFavourite) where.favorites = { some: { userId } };
      else {
        where.NOT = [
          ...(Array.isArray(where.NOT) ? where.NOT : where.NOT ? [where.NOT] : []),
          { favorites: { some: { userId } } },
        ];
      }
    }

    if (isSaved !== undefined) {
      if (isSaved) where.saves = { some: { userId } };
      else {
        where.NOT = [
          ...(Array.isArray(where.NOT) ? where.NOT : where.NOT ? [where.NOT] : []),
          { saves: { some: { userId } } },
        ];
      }
    }

    const orderBy: Prisma.PersonaOrderByWithRelationInput = {};
    if (sortBy === 'name') orderBy.name = sortOrder;
    else if (sortBy === 'updatedAt') orderBy.updatedAt = sortOrder;
    else orderBy.createdAt = sortOrder;

    const [personas, total] = await Promise.all([
      prisma.persona.findMany({ where, skip, take, orderBy }),
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
        ...(data.avatar !== undefined && { avatar: data.avatar != null ? (data.avatar as Prisma.InputJsonValue) : Prisma.JsonNull }),
        ...(data.backgroundImg !== undefined && { backgroundImg: data.backgroundImg != null ? (data.backgroundImg as Prisma.InputJsonValue) : Prisma.JsonNull }),
        tags: data.tags,
        lorebookId: data.lorebookId,
      },
    });
  },

  async updatePersona(id: string, data: UpdatePersonaData): Promise<Persona> {
    const updateData: Prisma.PersonaUpdateInput = {};
    if (data.name) updateData.name = data.name;
    if (data.slug) updateData.slug = data.slug;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.rating) updateData.rating = data.rating;
    if (data.visibility) updateData.visibility = data.visibility;
    if (data.avatar !== undefined) updateData.avatar = data.avatar === null ? Prisma.JsonNull : (data.avatar as Prisma.InputJsonValue);
    if (data.backgroundImg !== undefined) updateData.backgroundImg = data.backgroundImg === null ? Prisma.JsonNull : (data.backgroundImg as Prisma.InputJsonValue);
    if (data.tags !== undefined) updateData.tags = data.tags;
    if (data.lorebookId !== undefined) {
      updateData.lorebook = data.lorebookId ? { connect: { id: data.lorebookId } } : { disconnect: true };
    }
    // user-specific favourite/saved state is handled by dedicated toggle methods

    return prisma.persona.update({
      where: { id },
      data: updateData,
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

  async toggleFavouriteForUser(id: string, userId: string): Promise<Persona> {
    const existing = await prisma.personaFavorite.findUnique({
      where: {
        userId_personaId: { userId, personaId: id },
      },
    });

    if (existing) {
      await prisma.personaFavorite.delete({
        where: {
          userId_personaId: { userId, personaId: id },
        },
      });
    } else {
      await prisma.personaFavorite.create({
        data: {
          userId,
          personaId: id,
        },
      });
    }

    return prisma.persona.update({
      where: { id },
      data: {},
    });
  },

  async toggleSavedForUser(id: string, userId: string): Promise<Persona> {
    const existing = await prisma.personaSaved.findUnique({
      where: {
        userId_personaId: { userId, personaId: id },
      },
    });

    if (existing) {
      await prisma.personaSaved.delete({
        where: {
          userId_personaId: { userId, personaId: id },
        },
      });
    } else {
      await prisma.personaSaved.create({
        data: {
          userId,
          personaId: id,
        },
      });
    }

    return prisma.persona.update({
      where: { id },
      data: {},
    });
  },
};
