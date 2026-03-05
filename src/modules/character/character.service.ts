import { characterRepository } from './character.repository.js';
import { generateSlug } from '../../utils/helpers.js';
import { createError } from '../../utils/index.js';
import { normalizeCharacterData } from '../../utils/character-card.parser.js';
import { prisma } from '../../lib/prisma.js';
import {
  deleteFromS3IfExists,
  transformEntityImageUrls,
  transformEntitiesImageUrls,
} from '../../lib/s3.service.js';
import type {
  CreateCharacterInput,
  UpdateCharacterInput,
  CharacterQueryParams,
  CharacterResponse,
  CharacterListResponse,
  MessageResponse,
  CreateCharacterData,
  UpdateCharacterData,
} from './character.types.js';
import type { Character } from '@prisma/client';

// ============================================
// Character Service
// ============================================

export const characterService = {
  // ============================================
  // Create Character
  // ============================================

  async createCharacter(userId: string, input: CreateCharacterInput): Promise<CharacterResponse> {
    // Generate unique slug
    let slug = generateSlug(input.name);
    let attempts = 0;
    const maxAttempts = 10;

    // Ensure slug is unique
    while (await characterRepository.checkSlugExists(slug)) {
      attempts++;
      if (attempts >= maxAttempts) {
        throw createError.internal('Failed to generate unique slug');
      }
      slug = generateSlug(input.name);
    }

    // Validate related entities if provided
    if (input.personaId) {
      // Verify persona belongs to user (you can add this check if needed)
      // For now, we'll let Prisma handle foreign key constraints
    }

    if (input.lorebookId) {
      // Verify lorebook belongs to user (you can add this check if needed)
    }

    if (input.realmId) {
      // Verify realm belongs to user (you can add this check if needed)
    }

    // Fetch user's name for authorName
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    const visibility = input.visibility ?? 'private';
    const userActualName = user?.name ?? null;

    // Handle authorName based on visibility:
    // - For public characters: allow anonymous (if authorName is "Anonymous" or empty) or show actual name
    // - For private characters: always show actual name (since only creator can see it)
    let authorName: string | null = null;
    if (visibility === 'public') {
      // Public character: user can choose anonymous or their name
      if (input.authorName && input.authorName.trim().toLowerCase() !== 'anonymous') {
        authorName = input.authorName.trim();
      } else if (!input.authorName || input.authorName.trim() === '' || input.authorName.trim().toLowerCase() === 'anonymous') {
        authorName = 'Anonymous';
      } else {
        authorName = userActualName;
      }
    } else {
      // Private character: always show actual name (only creator can see it)
      authorName = userActualName;
    }

    const characterData: CreateCharacterData = {
      userId,
      name: input.name,
      slug,
      description: input.description ?? null,
      scenario: input.scenario ?? null,
      summary: input.summary ?? null,
      rating: input.rating ?? 'SFW',
      visibility,
      avatar: input.avatar ?? null,
      backgroundImg: input.backgroundImg ?? null,
      tags: input.tags ?? [],
      firstMessage: input.firstMessage ?? null,
      alternateMessages: input.alternateMessages ?? [],
      exampleDialogues: input.exampleDialogues ?? [],
      authorNotes: input.authorNotes ?? null,
      characterNotes: input.characterNotes ?? null,
      authorName,
      personaId: input.personaId ?? null,
      lorebookId: input.lorebookId ?? null,
      realmId: input.realmId ?? null,
    } as CreateCharacterData;

    const character = await characterRepository.createCharacter(characterData);

    return { character: await transformEntityImageUrls(character) };
  },

  // ============================================
  // Get Character By ID
  // ============================================

  async getCharacterById(id: string, userId?: string): Promise<CharacterResponse> {
    const character = await characterRepository.findCharacterById(id);

    if (!character) {
      throw createError.notFound('Character not found');
    }

    // Check visibility
    if (character.visibility === 'private' && character.userId !== userId) {
      throw createError.forbidden('Character is private');
    }

    return { character: await transformEntityImageUrls(character) };
  },

  // ============================================
  // Get Character By Slug
  // ============================================

  async getCharacterBySlug(slug: string, userId?: string): Promise<CharacterResponse> {
    const character = await characterRepository.findCharacterBySlug(slug);

    if (!character) {
      throw createError.notFound('Character not found');
    }

    // Check visibility
    if (character.visibility === 'private' && character.userId !== userId) {
      throw createError.forbidden('Character is private');
    }

    return { character: await transformEntityImageUrls(character) };
  },

  // ============================================
  // Get User's Characters
  // ============================================

  async getUserCharacters(userId: string, params: CharacterQueryParams): Promise<CharacterListResponse> {
    const { characters, total } = await characterRepository.findCharactersByUser(userId, params);

    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const totalPages = Math.ceil(total / limit);

    return {
      characters: await transformEntitiesImageUrls(characters),
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  },

  // ============================================
  // Get Public Characters
  // ============================================

  async getPublicCharacters(params: CharacterQueryParams): Promise<CharacterListResponse> {
    const { characters, total } = await characterRepository.findPublicCharacters(params);

    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const totalPages = Math.ceil(total / limit);

    return {
      characters: await transformEntitiesImageUrls(characters),
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  },

  // ============================================
  // Update Character
  // ============================================

  async updateCharacter(
    id: string,
    userId: string,
    input: UpdateCharacterInput
  ): Promise<CharacterResponse> {
    // Verify character exists and belongs to user
    const existingCharacter = await characterRepository.findCharacterById(id);

    if (!existingCharacter) {
      throw createError.notFound('Character not found');
    }

    if (existingCharacter.userId !== userId) {
      throw createError.forbidden('You do not have permission to update this character');
    }

    // If name is being updated, generate new slug
    let slug: string | undefined;
    if (input.name && input.name !== existingCharacter.name) {
      slug = generateSlug(input.name);
      let attempts = 0;
      const maxAttempts = 10;

      // Ensure slug is unique
      while (await characterRepository.checkSlugExists(slug, id)) {
        attempts++;
        if (attempts >= maxAttempts) {
          throw createError.internal('Failed to generate unique slug');
        }
        slug = generateSlug(input.name);
      }
    }

    // Determine the new visibility (use existing if not being updated)
    const newVisibility = input.visibility ?? existingCharacter.visibility;

    // Handle authorName based on visibility:
    // - For public characters: allow anonymous (if authorName is "Anonymous" or empty) or show actual name
    // - For private characters: always show actual name (since only creator can see it)
    let authorName: string | null | undefined = undefined;
    if (input.authorName !== undefined) {
      if (newVisibility === 'public') {
        // Public character: user can choose anonymous or their name
        if (input.authorName && input.authorName.trim().toLowerCase() !== 'anonymous') {
          authorName = input.authorName.trim();
        } else if (!input.authorName || input.authorName.trim() === '' || input.authorName.trim().toLowerCase() === 'anonymous') {
          authorName = 'Anonymous';
        } else {
          // Fetch user's name if not provided
          const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { name: true },
          });
          authorName = user?.name ?? null;
        }
      } else {
        // Private character: always show actual name (only creator can see it)
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { name: true },
        });
        authorName = user?.name ?? null;
      }
    } else if (input.visibility === 'public' && existingCharacter.visibility === 'private') {
      // Character is being changed from private to public
      // If authorName is not explicitly set, default to "Anonymous" for privacy
      if (!existingCharacter.authorName || existingCharacter.authorName.trim().toLowerCase() === 'anonymous') {
        authorName = 'Anonymous';
      } else {
        // Keep existing authorName
        authorName = existingCharacter.authorName;
      }
    } else if (input.visibility === 'private' && existingCharacter.visibility === 'public') {
      // Character is being changed from public to private
      // Always show actual name for private characters
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true },
      });
      authorName = user?.name ?? null;
    }

    // Delete old S3 images when replacing with new uploads
    if (input.avatar !== undefined && input.avatar !== null) {
      const oldAvatar = existingCharacter.avatar as { url?: string } | null;
      if (oldAvatar?.url) {
        await deleteFromS3IfExists(oldAvatar.url);
      }
    }
    if (input.backgroundImg !== undefined && input.backgroundImg !== null) {
      const oldBackground = existingCharacter.backgroundImg as { url?: string } | null;
      if (oldBackground?.url) {
        await deleteFromS3IfExists(oldBackground.url);
      }
    }
    // Also delete when explicitly setting to null (removing image)
    if (input.avatar === null) {
      const oldAvatar = existingCharacter.avatar as { url?: string } | null;
      if (oldAvatar?.url) {
        await deleteFromS3IfExists(oldAvatar.url);
      }
    }
    if (input.backgroundImg === null) {
      const oldBackground = existingCharacter.backgroundImg as { url?: string } | null;
      if (oldBackground?.url) {
        await deleteFromS3IfExists(oldBackground.url);
      }
    }

    const updateData: UpdateCharacterData = {
      ...(input.name && { name: input.name }),
      ...(slug && { slug }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.scenario !== undefined && { scenario: input.scenario }),
      ...(input.summary !== undefined && { summary: input.summary }),
      ...(input.rating && { rating: input.rating }),
      ...(input.visibility && { visibility: input.visibility }),
      ...(input.avatar !== undefined && { avatar: input.avatar }),
      ...(input.backgroundImg !== undefined && { backgroundImg: input.backgroundImg }),
      ...(input.tags !== undefined && { tags: input.tags }),
      ...(input.firstMessage !== undefined && { firstMessage: input.firstMessage }),
      ...(input.alternateMessages !== undefined && { alternateMessages: input.alternateMessages }),
      ...(input.exampleDialogues !== undefined && { exampleDialogues: input.exampleDialogues }),
      ...(input.authorNotes !== undefined && { authorNotes: input.authorNotes }),
      ...(input.characterNotes !== undefined && { characterNotes: input.characterNotes }),
      ...(authorName !== undefined && { authorName }),
      ...(input.personaId !== undefined && { personaId: input.personaId }),
      ...(input.lorebookId !== undefined && { lorebookId: input.lorebookId }),
      ...(input.realmId !== undefined && { realmId: input.realmId }),
      ...(input.isFavourite !== undefined && { isFavourite: input.isFavourite }),
      ...(input.isSaved !== undefined && { isSaved: input.isSaved }),
    };

    const character = await characterRepository.updateCharacter(id, updateData);

    return { character: await transformEntityImageUrls(character) };
  },

  // ============================================
  // Delete Character
  // ============================================

  async deleteCharacter(id: string, userId: string): Promise<MessageResponse> {
    // Verify character exists and belongs to user
    const character = await characterRepository.findCharacterById(id);

    if (!character) {
      throw createError.notFound('Character not found');
    }

    if (character.userId !== userId) {
      throw createError.forbidden('You do not have permission to delete this character');
    }

    // Delete associated images from S3
    const avatar = character.avatar as { url?: string } | null;
    const backgroundImg = character.backgroundImg as { url?: string } | null;
    if (avatar?.url) await deleteFromS3IfExists(avatar.url);
    if (backgroundImg?.url) await deleteFromS3IfExists(backgroundImg.url);

    await characterRepository.deleteCharacter(id);

    return { message: 'Character deleted successfully' };
  },

  // ============================================
  // Toggle Favourite
  // ============================================

  async toggleFavourite(id: string, userId: string): Promise<CharacterResponse> {
    const character = await characterRepository.findCharacterById(id);

    if (!character) {
      throw createError.notFound('Character not found');
    }

    if (character.userId !== userId) {
      throw createError.forbidden('You do not have permission to modify this character');
    }

    const updatedCharacter = await characterRepository.updateCharacter(id, {
      isFavourite: !character.isFavourite,
    });

    return { character: await transformEntityImageUrls(updatedCharacter) };
  },

  // ============================================
  // Toggle Saved
  // ============================================

  async toggleSaved(id: string, userId: string): Promise<CharacterResponse> {
    const character = await characterRepository.findCharacterById(id);

    if (!character) {
      throw createError.notFound('Character not found');
    }

    if (character.userId !== userId) {
      throw createError.forbidden('You do not have permission to modify this character');
    }

    const updatedCharacter = await characterRepository.updateCharacter(id, {
      isSaved: !character.isSaved,
    });

    return { character: await transformEntityImageUrls(updatedCharacter) };
  },

  // ============================================
  // Duplicate Character
  // ============================================

  async duplicateCharacter(id: string, userId: string): Promise<CharacterResponse> {
    // Verify character exists and belongs to user
    const character = await characterRepository.findCharacterById(id);

    if (!character) {
      throw createError.notFound('Character not found');
    }

    if (character.userId !== userId) {
      throw createError.forbidden('You do not have permission to duplicate this character');
    }

    // Fetch user's name for authorName
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    // Generate new name with "(Copy)" suffix
    const newName = `${character.name} (Copy)`;
    let slug = generateSlug(newName);
    let attempts = 0;
    const maxAttempts = 10;

    // Ensure slug is unique
    while (await characterRepository.checkSlugExists(slug)) {
      attempts++;
      if (attempts >= maxAttempts) {
        throw createError.internal('Failed to generate unique slug');
      }
      slug = generateSlug(newName);
    }

    // Handle authorName based on visibility
    const visibility = character.visibility;
    const userActualName = user?.name ?? null;
    let authorName: string | null = null;

    if (visibility === 'public') {
      // For public characters, keep the same authorName (could be "Anonymous" or actual name)
      authorName = character.authorName ?? userActualName;
    } else {
      // For private characters, always use actual name
      authorName = userActualName;
    }

    // Create duplicate character data
    const characterData: CreateCharacterData = {
      userId,
      name: newName,
      slug,
      description: character.description,
      scenario: character.scenario,
      summary: character.summary,
      rating: character.rating,
      visibility: character.visibility,
      avatar: character.avatar as Record<string, unknown> | null,
      backgroundImg: character.backgroundImg as Record<string, unknown> | null,
      tags: character.tags,
      firstMessage: character.firstMessage,
      alternateMessages: character.alternateMessages,
      exampleDialogues: character.exampleDialogues,
      authorNotes: character.authorNotes,
      characterNotes: character.characterNotes,
      authorName,
      personaId: character.personaId,
      lorebookId: character.lorebookId,
      realmId: character.realmId,
    };

    const duplicatedCharacter = await characterRepository.createCharacter(characterData);

    return { character: await transformEntityImageUrls(duplicatedCharacter) };
  },

  // ============================================
  // Batch Duplicate Characters
  // ============================================

  async batchDuplicateCharacters(characterIds: string[], userId: string): Promise<{ characters: Character[] }> {
    if (!characterIds || characterIds.length === 0) {
      throw createError.badRequest('Character IDs array is required and cannot be empty');
    }

    if (characterIds.length > 100) {
      throw createError.badRequest('Maximum 100 characters can be duplicated at once');
    }

    // Fetch all characters and verify ownership
    const characters = await Promise.all(
      characterIds.map((id) => characterRepository.findCharacterById(id))
    );

    // Check if all characters exist
    const missingCharacters = characters.filter((char) => !char);
    if (missingCharacters.length > 0) {
      throw createError.notFound('One or more characters not found');
    }

    // Check if all characters belong to the user
    const unauthorizedCharacters = characters.filter((char) => char && char.userId !== userId);
    if (unauthorizedCharacters.length > 0) {
      throw createError.forbidden('You do not have permission to duplicate one or more characters');
    }

    // Fetch user's name once
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    const userActualName = user?.name ?? null;

    // Duplicate all characters
    const duplicatedCharacters: Character[] = [];

    for (const character of characters) {
      if (!character) continue;

      // Generate new name with "(Copy)" suffix
      const newName = `${character.name} (Copy)`;
      let slug = generateSlug(newName);
      let attempts = 0;
      const maxAttempts = 10;

      // Ensure slug is unique
      while (await characterRepository.checkSlugExists(slug)) {
        attempts++;
        if (attempts >= maxAttempts) {
          throw createError.internal(`Failed to generate unique slug for character: ${character.name}`);
        }
        slug = generateSlug(newName);
      }

      // Handle authorName based on visibility
      const visibility = character.visibility;
      let authorName: string | null = null;

      if (visibility === 'public') {
        // For public characters, keep the same authorName (could be "Anonymous" or actual name)
        authorName = character.authorName ?? userActualName;
      } else {
        // For private characters, always use actual name
        authorName = userActualName;
      }

      // Create duplicate character data
      const characterData: CreateCharacterData = {
        userId,
        name: newName,
        slug,
        description: character.description,
        scenario: character.scenario,
        summary: character.summary,
        rating: character.rating,
        visibility: character.visibility,
        avatar: character.avatar as Record<string, unknown> | null,
        backgroundImg: character.backgroundImg as Record<string, unknown> | null,
        tags: character.tags,
        firstMessage: character.firstMessage,
        alternateMessages: character.alternateMessages,
        exampleDialogues: character.exampleDialogues,
        authorNotes: character.authorNotes,
        characterNotes: character.characterNotes,
        authorName,
        personaId: character.personaId,
        lorebookId: character.lorebookId,
        realmId: character.realmId,
      };

      const duplicatedCharacter = await characterRepository.createCharacter(characterData);
      duplicatedCharacters.push(duplicatedCharacter);
    }

    return { characters: await transformEntitiesImageUrls(duplicatedCharacters) };
  },

  // ============================================
  // Batch Delete Characters
  // ============================================

  async batchDeleteCharacters(characterIds: string[], userId: string): Promise<{ success: number; failed: number; errors: Array<{ id: string; error: string }> }> {
    if (!characterIds || characterIds.length === 0) {
      throw createError.badRequest('Character IDs array is required and cannot be empty');
    }

    if (characterIds.length > 100) {
      throw createError.badRequest('Maximum 100 characters can be deleted at once');
    }

    // Fetch all characters and verify ownership
    const characters = await Promise.all(
      characterIds.map((id) => characterRepository.findCharacterById(id))
    );

    const results = {
      success: 0,
      failed: 0,
      errors: [] as Array<{ id: string; error: string }>,
    };

    // Delete characters in parallel (Prisma handles transactions)
    await Promise.all(
      characters.map(async (character, index) => {
        const characterId = characterIds[index];

        // Ensure characterId exists
        if (!characterId) {
          results.failed++;
          results.errors.push({
            id: 'unknown',
            error: 'Character ID is missing',
          });
          return;
        }

        try {
          // Check if character exists
          if (!character) {
            results.failed++;
            results.errors.push({
              id: characterId,
              error: 'Character not found',
            });
            return;
          }

          // Check if character belongs to user
          if (character.userId !== userId) {
            results.failed++;
            results.errors.push({
              id: characterId,
              error: 'You do not have permission to delete this character',
            });
            return;
          }

          // Delete character (cascade delete will handle associated chats)
          await characterRepository.deleteCharacter(characterId);
          results.success++;
        } catch (error: any) {
          results.failed++;
          results.errors.push({
            id: characterId,
            error: error.message || 'Unknown error occurred',
          });
        }
      })
    );

    return results;
  },

  // ============================================
  // Import Character
  // ============================================

  async importCharacter(userId: string, characterData: any): Promise<CharacterResponse> {
    // Validate required fields
    if (!characterData.name || typeof characterData.name !== 'string') {
      throw createError.badRequest('Character name is required');
    }

    // Generate unique slug
    let slug = generateSlug(characterData.name);
    let attempts = 0;
    const maxAttempts = 10;

    while (await characterRepository.checkSlugExists(slug)) {
      attempts++;
      if (attempts >= maxAttempts) {
        throw createError.internal('Failed to generate unique slug');
      }
      slug = generateSlug(characterData.name);
    }

    // Fetch user's name for authorName
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    const visibility = characterData.visibility ?? 'private';
    const userActualName = user?.name ?? null;

    // Handle authorName based on visibility
    let authorName: string | null = null;
    if (visibility === 'public') {
      if (characterData.authorName && characterData.authorName.trim().toLowerCase() !== 'anonymous') {
        authorName = characterData.authorName.trim();
      } else {
        authorName = 'Anonymous';
      }
    } else {
      authorName = userActualName;
    }

    // Normalize avatar/backgroundImg: accept string URL or { url } object (V1/V2/PNG formats)
    const avatarObj =
      characterData.avatar && typeof characterData.avatar === 'object' && 'url' in characterData.avatar
        ? (characterData.avatar as { url: string })
        : typeof characterData.avatar === 'string' && characterData.avatar.trim()
          ? { url: characterData.avatar }
          : null;
    const backgroundObj =
      characterData.backgroundImg && typeof characterData.backgroundImg === 'object' && 'url' in characterData.backgroundImg
        ? (characterData.backgroundImg as { url: string })
        : typeof characterData.backgroundImg === 'string' && characterData.backgroundImg.trim()
          ? { url: characterData.backgroundImg }
          : null;

    // Map imported data to CreateCharacterData (supports V1, V2 JSON and PNG metadata)
    const createData: CreateCharacterData = {
      userId,
      name: characterData.name,
      slug,
      description: characterData.description ?? null,
      scenario: characterData.scenario ?? null,
      summary: characterData.summary ?? null,
      rating: characterData.rating ?? 'SFW',
      visibility,
      avatar: avatarObj,
      backgroundImg: backgroundObj,
      tags: Array.isArray(characterData.tags) ? characterData.tags : [],
      firstMessage: characterData.firstMessage ?? null,
      alternateMessages: Array.isArray(characterData.alternateMessages) ? characterData.alternateMessages : [],
      exampleDialogues: Array.isArray(characterData.exampleDialogues) ? characterData.exampleDialogues : [],
      authorNotes: characterData.authorNotes ?? null,
      characterNotes: characterData.characterNotes ?? null,
      authorName,
      personaId: null, // Don't import relationships
      lorebookId: null,
      realmId: null,
    };

    const character = await characterRepository.createCharacter(createData);
    return { character: await transformEntityImageUrls(character) };
  },

  // ============================================
  // Bulk Import Characters
  // ============================================

  async bulkImportCharacters(userId: string, charactersData: any[]): Promise<{
    success: number;
    failed: number;
    characters: Character[];
    errors: Array<{ name: string; error: string }>;
  }> {
    const results = {
      success: 0,
      failed: 0,
      characters: [] as Character[],
      errors: [] as Array<{ name: string; error: string }>,
    };

    // Fetch user's name once
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    const userActualName = user?.name ?? null;

    // Process each character (normalize V1/V2 format first)
    for (const rawData of charactersData) {
      try {
        // Normalize V1/V2 character card format to our schema
        const characterData = normalizeCharacterData(rawData);

        // Validate required fields
        if (!characterData.name || typeof characterData.name !== 'string') {
          results.failed++;
          results.errors.push({
            name: (rawData as { name?: string })?.name || 'Unknown',
            error: 'Character name is required',
          });
          continue;
        }

        // Generate unique slug
        let slug = generateSlug(characterData.name);
        let attempts = 0;
        const maxAttempts = 10;

        while (await characterRepository.checkSlugExists(slug)) {
          attempts++;
          if (attempts >= maxAttempts) {
            throw createError.internal('Failed to generate unique slug');
          }
          slug = generateSlug(characterData.name);
        }

        const visibility = characterData.visibility ?? 'private';

        // Handle authorName based on visibility
        let authorName: string | null = null;
        if (visibility === 'public') {
          if (characterData.authorName && characterData.authorName.trim().toLowerCase() !== 'anonymous') {
            authorName = characterData.authorName.trim();
          } else {
            authorName = 'Anonymous';
          }
        } else {
          authorName = userActualName;
        }

        // Normalize avatar/backgroundImg (string URL or { url } object)
        const avatarObj =
          characterData.avatar && typeof characterData.avatar === 'object' && 'url' in characterData.avatar
            ? (characterData.avatar as { url: string })
            : typeof characterData.avatar === 'string' && characterData.avatar.trim()
              ? { url: characterData.avatar }
              : null;
        const backgroundObj =
          characterData.backgroundImg && typeof characterData.backgroundImg === 'object' && 'url' in characterData.backgroundImg
            ? (characterData.backgroundImg as { url: string })
            : typeof characterData.backgroundImg === 'string' && characterData.backgroundImg.trim()
              ? { url: characterData.backgroundImg }
              : null;

        // Map imported data to CreateCharacterData
        const createData: CreateCharacterData = {
          userId,
          name: characterData.name,
          slug,
          description: characterData.description ?? null,
          scenario: characterData.scenario ?? null,
          summary: characterData.summary ?? null,
          rating: characterData.rating ?? 'SFW',
          visibility,
          avatar: avatarObj,
          backgroundImg: backgroundObj,
          tags: Array.isArray(characterData.tags) ? characterData.tags : [],
          firstMessage: characterData.firstMessage ?? null,
          alternateMessages: Array.isArray(characterData.alternateMessages) ? characterData.alternateMessages : [],
          exampleDialogues: Array.isArray(characterData.exampleDialogues) ? characterData.exampleDialogues : [],
          authorNotes: characterData.authorNotes ?? null,
          characterNotes: characterData.characterNotes ?? null,
          authorName,
          personaId: null, // Don't import relationships
          lorebookId: null,
          realmId: null,
        };

        const character = await characterRepository.createCharacter(createData);
        results.success++;
        results.characters.push(character);
      } catch (error: any) {
        results.failed++;
        const errName =
          (typeof rawData === 'object' && rawData !== null && 'name' in rawData
            ? (rawData as { name?: string }).name
            : null) ||
          (typeof rawData === 'object' && rawData !== null && 'data' in rawData
            ? (rawData as { data?: { name?: string } }).data?.name
            : null) ||
          'Unknown';
        results.errors.push({
          name: String(errName),
          error: error.message || 'Unknown error occurred',
        });
      }
    }

    return {
      ...results,
      characters: await transformEntitiesImageUrls(results.characters),
    };
  },
};

export default characterService;

