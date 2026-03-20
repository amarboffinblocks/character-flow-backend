import { prisma } from '../../lib/prisma.js';
import type { Character, Rating, Visibility } from '@prisma/client';
import { Prisma } from '@prisma/client';
import type { CreateCharacterData, UpdateCharacterData, CharacterQueryParams } from './character.types.js';

// ============================================
// Character Repository
// ============================================

export const characterRepository = {
  // ============================================
  // Character Operations
  // ============================================

  async findCharacterById(id: string): Promise<Character | null> {
    return prisma.character.findUnique({
      where: { id },
      include: {
        persona: true,
        lorebook: true,
        realm: true,
      },
    });
  },

  async findCharacterBySlug(slug: string): Promise<Character | null> {
    return prisma.character.findUnique({
      where: { slug },
      include: {
        persona: true,
        lorebook: true,
        realm: true,
      },
    });
  },

  async findCharacterBySlugAndUser(slug: string, userId: string): Promise<Character | null> {
    return prisma.character.findFirst({
      where: {
        slug,
        userId,
      },
      include: {
        persona: true,
        lorebook: true,
        realm: true,
      },
    });
  },

  async findCharactersByUser(
    userId: string,
    params: CharacterQueryParams
  ): Promise<{ characters: Character[]; total: number }> {
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

    // If limit is 0, fetch all characters (no pagination)
    const skip = limit === 0 ? undefined : (page - 1) * limit;
    const take = limit === 0 ? undefined : limit;

    // Build where clause (use Prisma type for NOT and tags)
    const where: Prisma.CharacterWhereInput = {
      userId,
    };

    if (rating) {
      where.rating = rating as Rating;
    }

    if (visibility) {
      where.visibility = visibility as Visibility;
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
      where.NOT = [
        { tags: { hasSome: excludeTags } },
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

    const [characters, total] = await Promise.all([
      prisma.character.findMany({
        where,
        ...(skip !== undefined && { skip }),
        ...(take !== undefined && { take }),
        orderBy,
        include: {
          persona: true,
          lorebook: true,
          realm: true,
        },
      }),
      prisma.character.count({ where }),
    ]);

    return { characters, total };
  },

  async findPublicCharacters(
    params: CharacterQueryParams,
    currentUserId?: string
  ): Promise<{ characters: Character[]; total: number }> {
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

    // If limit is 0, fetch all characters (no pagination)
    const skip = limit === 0 ? undefined : (page - 1) * limit;
    const take = limit === 0 ? undefined : limit;

    // Build where clause (use Prisma type for NOT and tags)
    const where: Prisma.CharacterWhereInput = {
      visibility: 'public',
    };

    if (rating) {
      where.rating = rating as Rating;
    }

    if (tags && tags.length > 0) {
      where.tags = { hasEvery: tags };
    }

    if (excludeTags && excludeTags.length > 0) {
      where.NOT = [
        { tags: { hasSome: excludeTags } },
      ];
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

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Build orderBy clause
    const orderBy: Record<string, 'asc' | 'desc'> = {};
    orderBy[sortBy] = sortOrder;

    const [characters, total] = await Promise.all([
      prisma.character.findMany({
        where,
        ...(skip !== undefined && { skip }),
        ...(take !== undefined && { take }),
        orderBy,
        include: {
          persona: true,
          lorebook: true,
          realm: true,
          user: {
            select: {
              id: true,
              username: true,
              avatar: true,
            },
          },
        },
      }),
      prisma.character.count({ where }),
    ]);

    return { characters, total };
  },

  async findAccessibleCharacters(
    userId: string,
    params: CharacterQueryParams
  ): Promise<{ characters: Character[]; total: number }> {
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

    // Accessible set for authenticated users:
    // - their own characters (public + private)
    // - other users' public characters
    const where: Prisma.CharacterWhereInput = {
      OR: [
        { userId },
        { visibility: 'public' },
      ],
    };

    if (rating) {
      where.rating = rating as Rating;
    }

    if (tags && tags.length > 0) {
      where.tags = { hasEvery: tags };
    }

    if (excludeTags && excludeTags.length > 0) {
      where.NOT = [
        { tags: { hasSome: excludeTags } },
      ];
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

    const orderBy: Record<string, 'asc' | 'desc'> = {};
    orderBy[sortBy] = sortOrder;

    const [characters, total] = await Promise.all([
      prisma.character.findMany({
        where,
        ...(skip !== undefined && { skip }),
        ...(take !== undefined && { take }),
        orderBy,
        include: {
          persona: true,
          lorebook: true,
          realm: true,
          user: {
            select: {
              id: true,
              username: true,
              avatar: true,
            },
          },
        },
      }),
      prisma.character.count({ where }),
    ]);

    return { characters, total };
  },

  async createCharacter(data: CreateCharacterData): Promise<Character> {
    return prisma.character.create({
      data: {
        userId: data.userId,
        name: data.name,
        slug: data.slug,
        description: data.description,
        scenario: data.scenario,
        summary: data.summary,
        rating: data.rating,
        visibility: data.visibility,
        avatar: data.avatar ? (data.avatar as Prisma.InputJsonValue) : Prisma.JsonNull,
        backgroundImg: data.backgroundImg ? (data.backgroundImg as Prisma.InputJsonValue) : Prisma.JsonNull,
        tags: data.tags,
        firstMessage: data.firstMessage,
        alternateMessages: data.alternateMessages,
        exampleDialogues: data.exampleDialogues,
        authorNotes: data.authorNotes,
        characterNotes: data.characterNotes,
        authorName: data.authorName,
        personaId: data.personaId ?? null,
        lorebookId: data.lorebookId ?? null,
        realmId: data.realmId ?? null,
        tokens: data.tokens ?? null,
      },
      include: {
        persona: true,
        lorebook: true,
        realm: true,
      },
    });
  },

  async updateCharacter(id: string, data: UpdateCharacterData): Promise<Character> {
    const updateData: Prisma.CharacterUpdateInput = {};

    if (data.name) updateData.name = data.name;
    if (data.slug) updateData.slug = data.slug;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.scenario !== undefined) updateData.scenario = data.scenario;
    if (data.summary !== undefined) updateData.summary = data.summary;
    if (data.rating) updateData.rating = data.rating;
    if (data.visibility) updateData.visibility = data.visibility;
    if (data.avatar !== undefined) {
      updateData.avatar = data.avatar ? (data.avatar as Prisma.InputJsonValue) : Prisma.JsonNull;
    }
    if (data.backgroundImg !== undefined) {
      updateData.backgroundImg = data.backgroundImg ? (data.backgroundImg as Prisma.InputJsonValue) : Prisma.JsonNull;
    }
    if (data.tags !== undefined) updateData.tags = data.tags;
    if (data.firstMessage !== undefined) updateData.firstMessage = data.firstMessage;
    if (data.alternateMessages !== undefined) updateData.alternateMessages = data.alternateMessages;
    if (data.exampleDialogues !== undefined) updateData.exampleDialogues = data.exampleDialogues;
    if (data.authorNotes !== undefined) updateData.authorNotes = data.authorNotes;
    if (data.characterNotes !== undefined) updateData.characterNotes = data.characterNotes;
    if (data.authorName !== undefined) updateData.authorName = data.authorName;

    // Handle relationship updates (use connect/disconnect for relations)
    if (data.personaId !== undefined) {
      updateData.persona = data.personaId ? { connect: { id: data.personaId } } : { disconnect: true };
    }
    if (data.lorebookId !== undefined) {
      updateData.lorebook = data.lorebookId ? { connect: { id: data.lorebookId } } : { disconnect: true };
    }
    if (data.realmId !== undefined) {
      updateData.realm = data.realmId ? { connect: { id: data.realmId } } : { disconnect: true };
    }

    // user-specific favourite/saved state is handled by dedicated toggle methods
    if (data.tokens !== undefined) updateData.tokens = data.tokens;

    return prisma.character.update({
      where: { id },
      data: updateData,
      include: {
        persona: true,
        lorebook: true,
        realm: true,
      },
    });
  },

  async deleteCharacter(id: string): Promise<void> {
    await prisma.character.delete({
      where: { id },
    });
  },

  async checkSlugExists(slug: string, excludeId?: string): Promise<boolean> {
    const character = await prisma.character.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!character) {
      return false;
    }

    if (excludeId && character.id === excludeId) {
      return false;
    }

    return true;
  },

  async incrementChatCount(id: string): Promise<void> {
    await prisma.character.update({
      where: { id },
      data: {
        chatCount: {
          increment: 1,
        },
      },
    });
  },

  async updateTokens(id: string, tokens: number): Promise<void> {
    await prisma.character.update({
      where: { id },
      data: { tokens },
    });
  },

  async toggleFavouriteForUser(id: string, userId: string): Promise<Character> {
    const existing = await prisma.characterFavorite.findUnique({
      where: {
        userId_characterId: {
          userId,
          characterId: id,
        },
      },
    });

    if (existing) {
      await prisma.characterFavorite.delete({
        where: {
          userId_characterId: {
            userId,
            characterId: id,
          },
        },
      });
    } else {
      await prisma.characterFavorite.create({
        data: {
          userId,
          characterId: id,
        },
      });
    }

    return prisma.character.update({
      where: { id },
      data: {},
      include: {
        persona: true,
        lorebook: true,
        realm: true,
      },
    });
  },

  async toggleSavedForUser(id: string, userId: string): Promise<Character> {
    const existing = await prisma.characterSaved.findUnique({
      where: {
        userId_characterId: {
          userId,
          characterId: id,
        },
      },
    });

    if (existing) {
      await prisma.characterSaved.delete({
        where: {
          userId_characterId: {
            userId,
            characterId: id,
          },
        },
      });
    } else {
      await prisma.characterSaved.create({
        data: {
          userId,
          characterId: id,
        },
      });
    }

    return prisma.character.update({
      where: { id },
      data: {},
      include: {
        persona: true,
        lorebook: true,
        realm: true,
      },
    });
  },
};

export default characterRepository;

