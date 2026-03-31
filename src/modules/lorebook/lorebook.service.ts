import { lorebookRepository } from './lorebook.repository.js';
import { tagService } from '../tag/index.js';
import { generateSlug } from '../../utils/helpers.js';
import { createError } from '../../utils/index.js';
import { prisma } from '../../lib/prisma.js';
import {
  deleteUploadedImageIfExists,
  transformEntityImageUrls,
  transformEntitiesImageUrls,
} from '../../lib/cloudinary.service.js';
import type {
  CreateLorebookInput,
  UpdateLorebookInput,
  LorebookQueryParams,
  LorebookResponse,
  LorebookListResponse,
  MessageResponse,
  CreateLorebookData,
  UpdateLorebookData,
  CreateLorebookEntryInput,
  UpdateLorebookEntryInput,
  LorebookEntryResponse,
  LorebookEntryListResponse,
  CreateLorebookEntryData,
  UpdateLorebookEntryData,
} from './lorebook.types.js';
import type { Lorebook, LorebookEntry } from '@prisma/client';

// ============================================
// Chub / external format: entries as object keyed by id
// ============================================

const PRIORITY_MAX = 100;

async function generateFallbackLorebookName(userId: string): Promise<string> {
  const existingLorebooks = await prisma.lorebook.findMany({
    where: {
      userId,
      name: {
        startsWith: 'lorebook',
        mode: 'insensitive',
      },
    },
    select: { name: true },
  });

  let maxSuffix = 0;
  for (const lorebook of existingLorebooks) {
    const match = /^lorebook(\d+)$/i.exec(lorebook.name.trim());
    if (!match) continue;
    const num = Number(match[1]);
    if (Number.isFinite(num) && num > maxSuffix) {
      maxSuffix = num;
    }
  }

  return `lorebook${maxSuffix + 1}`;
}

function normalizeImportEntries(entries: unknown): CreateLorebookEntryInput[] {
  let list: CreateLorebookEntryInput[] = [];

  if (Array.isArray(entries)) {
    list = entries
      .map((e: any) => {
        const keywords = Array.isArray(e.keywords)
          ? e.keywords.map((k: any) => String(k).trim()).filter(Boolean)
          : Array.isArray(e.keys)
            ? e.keys.map((k: any) => String(k).trim()).filter(Boolean)
            : e.key
              ? (Array.isArray(e.key) ? e.key : [e.key]).map((k: any) => String(k).trim()).filter(Boolean)
              : e.name
                ? [String(e.name).trim()].filter(Boolean)
                : [];
        if (keywords.length === 0) return null;
        const context =
          typeof e.context === 'string'
            ? e.context.trim()
            : typeof e.content === 'string'
              ? e.content.trim()
              : '';
        const rawPriority =
          typeof e.priority === 'number'
            ? e.priority
            : typeof e.insertion_order === 'number'
              ? e.insertion_order
              : typeof e.order === 'number'
                ? e.order
                : 0;
        return {
          keywords,
          context: context || '[No context]',
          isEnabled: e.enabled !== undefined ? Boolean(e.enabled) : e.disable !== undefined ? !e.disable : true,
          priority: Math.min(Math.max(0, Math.floor(Number(rawPriority))), PRIORITY_MAX),
        } as CreateLorebookEntryInput;
      })
      .filter((e): e is CreateLorebookEntryInput => e != null);
  } else if (entries && typeof entries === 'object' && !Array.isArray(entries)) {
    list = (Object.values(entries) as any[])
      .map((e, i) => {
        const keywords = Array.isArray(e?.keys)
          ? e.keys.map((k: any) => String(k).trim()).filter(Boolean)
          : Array.isArray(e?.key)
            ? e.key.map((k: any) => String(k).trim()).filter(Boolean)
            : e?.name
              ? [String(e.name).trim()].filter(Boolean)
              : [];
        if (keywords.length === 0) return null;
        const context =
          typeof e?.content === 'string'
            ? e.content.trim()
            : typeof e?.comment === 'string'
              ? e.comment.trim()
              : '';
        const rawPriority =
          typeof e?.priority === 'number'
            ? e.priority
            : typeof e?.insertion_order === 'number'
              ? e.insertion_order
              : typeof e?.order === 'number'
                ? e.order
                : i + 1;
        return {
          keywords,
          context: context || '[No context]',
          isEnabled: e?.enabled !== undefined ? Boolean(e.enabled) : e?.disable !== undefined ? !e.disable : true,
          priority: Math.min(Math.max(0, Math.floor(Number(rawPriority))), PRIORITY_MAX),
        } as CreateLorebookEntryInput;
      })
      .filter((e): e is CreateLorebookEntryInput => e != null);
    list.sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
  }

  // Reassign priority to 1..100 so order is preserved and validator passes (max 100)
  return list.map((e, i) => ({
    ...e,
    priority: Math.min(i + 1, PRIORITY_MAX),
  }));
}

// ============================================
// Lorebook Service
// ============================================

export const lorebookService = {
  withUserState(lorebook: any, state: { isFavourite: boolean; isSaved: boolean }) {
    return {
      ...lorebook,
      isFavourite: state.isFavourite,
      isSaved: state.isSaved,
    };
  },

  async resolveUserState(lorebookId: string, userId?: string): Promise<{ isFavourite: boolean; isSaved: boolean }> {
    if (!userId) return { isFavourite: false, isSaved: false };

    const [favourite, saved] = await Promise.all([
      prisma.lorebookFavorite.findUnique({
        where: { userId_lorebookId: { userId, lorebookId } },
        select: { userId: true },
      }),
      prisma.lorebookSaved.findUnique({
        where: { userId_lorebookId: { userId, lorebookId } },
        select: { userId: true },
      }),
    ]);

    return { isFavourite: Boolean(favourite), isSaved: Boolean(saved) };
  },

  async resolveUserStateForList(lorebookIds: string[], userId?: string): Promise<Map<string, { isFavourite: boolean; isSaved: boolean }>> {
    const map = new Map<string, { isFavourite: boolean; isSaved: boolean }>();
    for (const id of lorebookIds) map.set(id, { isFavourite: false, isSaved: false });
    if (!userId || lorebookIds.length === 0) return map;

    const [favourites, saved] = await Promise.all([
      prisma.lorebookFavorite.findMany({
        where: { userId, lorebookId: { in: lorebookIds } },
        select: { lorebookId: true },
      }),
      prisma.lorebookSaved.findMany({
        where: { userId, lorebookId: { in: lorebookIds } },
        select: { lorebookId: true },
      }),
    ]);

    for (const row of favourites) {
      const prev = map.get(row.lorebookId) ?? { isFavourite: false, isSaved: false };
      map.set(row.lorebookId, { ...prev, isFavourite: true });
    }
    for (const row of saved) {
      const prev = map.get(row.lorebookId) ?? { isFavourite: false, isSaved: false };
      map.set(row.lorebookId, { ...prev, isSaved: true });
    }
    return map;
  },
  // ============================================
  // Create Lorebook
  // ============================================

  async createLorebook(userId: string, input: CreateLorebookInput): Promise<LorebookResponse> {
    // Generate unique slug
    let slug = generateSlug(input.name);
    let attempts = 0;
    const maxAttempts = 10;

    // Ensure slug is unique
    while (await lorebookRepository.checkSlugExists(slug)) {
      attempts++;
      if (attempts >= maxAttempts) {
        throw createError.internal('Failed to generate unique slug');
      }
      slug = generateSlug(input.name);
    }

    // Sync tags to Tag collection (create missing, increment usage)
    const createTagNames = Array.isArray(input.tags)
      ? input.tags.map((t: unknown) => String(t).trim()).filter(Boolean)
      : [];
    const createRatingCategory = input.rating === 'NSFW' ? 'NSFW' : 'SFW';
    if (createTagNames.length > 0) {
      await tagService.getOrCreateTags(createTagNames, createRatingCategory);
    }
    const normalizedCreateTags = createTagNames.length > 0 ? createTagNames.map((n) => n.toLowerCase()) : (input.tags ?? []);

    const lorebookData: CreateLorebookData = {
      userId,
      name: input.name,
      slug,
      description: input.description ?? null,
      rating: input.rating ?? 'SFW',
      visibility: input.visibility ?? 'private',
      avatar: input.avatar ?? null,
      tags: normalizedCreateTags,
    };

    // Create lorebook
    const lorebook = await lorebookRepository.createLorebook(lorebookData);

    // Create entries if provided
    if (input.entries && input.entries.length > 0) {
      const entryData: CreateLorebookEntryData[] = input.entries.map((entry) => ({
        lorebookId: lorebook.id,
        keywords: entry.keywords,
        context: entry.context,
        isEnabled: entry.isEnabled ?? true,
        priority: entry.priority ?? 0,
      }));

      await lorebookRepository.createEntries(entryData);
    }

    // Link characters if provided
    if (input.characterIds && input.characterIds.length > 0) {
      // Verify all characters belong to the user
      const characters = await prisma.character.findMany({
        where: {
          id: { in: input.characterIds },
          userId,
        },
      });

      if (characters.length !== input.characterIds.length) {
        throw createError.badRequest('Some characters not found or do not belong to you');
      }

      // Update characters to link to this lorebook
      await prisma.character.updateMany({
        where: {
          id: { in: input.characterIds },
          userId,
        },
        data: {
          lorebookId: lorebook.id,
        },
      });
    }

    // Link personas if provided
    if (input.personaIds && input.personaIds.length > 0) {
      // Verify all personas belong to the user
      const personas = await prisma.persona.findMany({
        where: {
          id: { in: input.personaIds },
          userId,
        },
      });

      if (personas.length !== input.personaIds.length) {
        throw createError.badRequest('Some personas not found or do not belong to you');
      }

      // Update personas to link to this lorebook
      await prisma.persona.updateMany({
        where: {
          id: { in: input.personaIds },
          userId,
        },
        data: {
          lorebookId: lorebook.id,
        },
      });
    }

    // Fetch lorebook with entries
    const lorebookWithEntries = await lorebookRepository.findLorebookById(lorebook.id);
    if (!lorebookWithEntries) {
      throw createError.notFound('Lorebook not found after creation');
    }

    const transformed = await transformEntityImageUrls(lorebookWithEntries);
    const state = await this.resolveUserState(lorebook.id, userId);
    return { lorebook: this.withUserState(transformed, state) };
  },

  // ============================================
  // Import Lorebook from JSON (supports our format and Chub format)
  // ============================================

  async importLorebook(userId: string, lorebookData: any): Promise<LorebookResponse> {
    const rawName = typeof lorebookData?.name === 'string' ? lorebookData.name.trim() : '';
    const resolvedName = rawName || await generateFallbackLorebookName(userId);

    const entries = normalizeImportEntries(lorebookData.entries);

    const tagNames = Array.isArray(lorebookData.tags)
      ? lorebookData.tags.map((t: unknown) => String(t).trim()).filter(Boolean)
      : [];

    let ratingCategory: "SFW" | "NSFW" = (lorebookData.rating === 'NSFW' || lorebookData.rating === 'SFW') ? lorebookData.rating : 'SFW';
    if (tagNames.some((t: string) => t.toLowerCase() === 'nsfw')) {
      ratingCategory = 'NSFW';
    } else if (tagNames.some((t: string) => t.toLowerCase() === 'sfw')) {
      ratingCategory = 'SFW';
    }

    if (tagNames.length > 0) {
      await tagService.getOrCreateTags(tagNames, ratingCategory);
    }

    const input: CreateLorebookInput = {
      name: resolvedName,
      description: lorebookData.description != null ? String(lorebookData.description).trim() : undefined,
      rating: ratingCategory,
      visibility: (lorebookData.visibility === 'public' || lorebookData.visibility === 'private') ? lorebookData.visibility : 'private',
      tags: tagNames.map((n: string) => n.toLowerCase()),
      avatar: lorebookData.avatar && typeof lorebookData.avatar === 'object' ? lorebookData.avatar : undefined,
      entries: entries.length > 0 ? entries : undefined,
    };

    return this.createLorebook(userId, input);
  },

  // ============================================
  // Get Lorebook By ID
  // ============================================

  async getLorebookById(id: string, userId?: string): Promise<LorebookResponse> {
    const lorebook = await lorebookRepository.findLorebookById(id);

    if (!lorebook) {
      throw createError.notFound('Lorebook not found');
    }

    // Check visibility
    if (lorebook.visibility === 'private' && lorebook.userId !== userId) {
      throw createError.forbidden('Lorebook is private');
    }

    const transformed = await transformEntityImageUrls(lorebook);
    const state = await this.resolveUserState(lorebook.id, userId);
    return { lorebook: this.withUserState(transformed, state) };
  },

  // ============================================
  // Get Lorebook By Slug
  // ============================================

  async getLorebookBySlug(slug: string, userId?: string): Promise<LorebookResponse> {
    const lorebook = await lorebookRepository.findLorebookBySlug(slug);

    if (!lorebook) {
      throw createError.notFound('Lorebook not found');
    }

    // Check visibility
    if (lorebook.visibility === 'private' && lorebook.userId !== userId) {
      throw createError.forbidden('Lorebook is private');
    }

    const transformed = await transformEntityImageUrls(lorebook);
    const state = await this.resolveUserState(lorebook.id, userId);
    return { lorebook: this.withUserState(transformed, state) };
  },

  // ============================================
  // Get User's Lorebooks
  // ============================================

  async getUserLorebooks(userId: string, params: LorebookQueryParams): Promise<LorebookListResponse> {
    const { lorebooks, total } = await lorebookRepository.findLorebooksByUser(userId, params);

    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const totalPages = Math.ceil(total / limit);

    const stateMap = await this.resolveUserStateForList(lorebooks.map((l) => l.id), userId);
    return {
      lorebooks: (await transformEntitiesImageUrls(lorebooks)).map((lorebook: any) =>
        this.withUserState(lorebook, stateMap.get(lorebook.id) ?? { isFavourite: false, isSaved: false })
      ),
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  },

  // ============================================
  // Get Public Lorebooks
  // ============================================

  async getPublicLorebooks(params: LorebookQueryParams, userId?: string): Promise<LorebookListResponse> {
    const { lorebooks, total } = await lorebookRepository.findPublicLorebooks(params, userId);

    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const totalPages = Math.ceil(total / limit);

    const stateMap = await this.resolveUserStateForList(lorebooks.map((l) => l.id), userId);
    return {
      lorebooks: (await transformEntitiesImageUrls(lorebooks)).map((lorebook: any) =>
        this.withUserState(lorebook, stateMap.get(lorebook.id) ?? { isFavourite: false, isSaved: false })
      ),
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  },

  async getAccessibleLorebooks(userId: string, params: LorebookQueryParams): Promise<LorebookListResponse> {
    const { lorebooks, total } = await lorebookRepository.findAccessibleLorebooks(userId, params);

    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const totalPages = Math.ceil(total / limit);
    const stateMap = await this.resolveUserStateForList(lorebooks.map((l) => l.id), userId);

    return {
      lorebooks: (await transformEntitiesImageUrls(lorebooks)).map((lorebook: any) =>
        this.withUserState(lorebook, stateMap.get(lorebook.id) ?? { isFavourite: false, isSaved: false })
      ),
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  },

  // ============================================
  // Update Lorebook
  // ============================================

  async updateLorebook(
    id: string,
    userId: string,
    input: UpdateLorebookInput
  ): Promise<LorebookResponse> {
    // Verify lorebook exists and belongs to user
    const existingLorebook = await lorebookRepository.findLorebookById(id);

    if (!existingLorebook) {
      throw createError.notFound('Lorebook not found');
    }

    if (existingLorebook.userId !== userId) {
      throw createError.forbidden('You do not have permission to update this lorebook');
    }

    // If name is being updated, generate new slug
    let slug: string | undefined;
    if (input.name && input.name !== existingLorebook.name) {
      slug = generateSlug(input.name);
      let attempts = 0;
      const maxAttempts = 10;

      // Ensure slug is unique
      while (await lorebookRepository.checkSlugExists(slug, id)) {
        attempts++;
        if (attempts >= maxAttempts) {
          throw createError.internal('Failed to generate unique slug');
        }
        slug = generateSlug(input.name);
      }
    }

    // Delete old stored avatar when replacing
    if (input.avatar !== undefined) {
      const oldAvatar = existingLorebook.avatar as { url?: string } | null;
      if (oldAvatar?.url) {
        await deleteUploadedImageIfExists(oldAvatar.url);
      }
    }
    if (input.avatar === null) {
      const oldAvatar = existingLorebook.avatar as { url?: string } | null;
      if (oldAvatar?.url) {
        await deleteUploadedImageIfExists(oldAvatar.url);
      }
    }

    const updateData: UpdateLorebookData = {
      ...(input.name && { name: input.name }),
      ...(slug && { slug }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.rating && { rating: input.rating }),
      ...(input.visibility && { visibility: input.visibility }),
      ...(input.avatar !== undefined && { avatar: input.avatar }),
      ...(input.tags !== undefined && { tags: input.tags }),
    };

    const lorebook = await lorebookRepository.updateLorebook(id, updateData);

    // Update entries if provided
    if (input.entries !== undefined) {
      // Delete all existing entries
      await lorebookRepository.deleteEntriesByLorebook(id);

      // Create new entries if provided
      if (input.entries.length > 0) {
        const entryData: CreateLorebookEntryData[] = input.entries.map((entry) => ({
          lorebookId: id,
          keywords: entry.keywords,
          context: entry.context,
          isEnabled: entry.isEnabled ?? true,
          priority: entry.priority ?? 0,
        }));

        await lorebookRepository.createEntries(entryData);
      }
    }

    // Handle character linking if provided
    if (input.characterIds !== undefined) {
      // First, unlink all characters currently linked to this lorebook
      await prisma.character.updateMany({
        where: {
          lorebookId: id,
          userId, // Only unlink characters belonging to this user
        },
        data: {
          lorebookId: null,
        },
      });

      // Then, link the new characters if any
      if (input.characterIds.length > 0) {
        // Verify all characters belong to the user
        const characters = await prisma.character.findMany({
          where: {
            id: { in: input.characterIds },
            userId,
          },
        });

        if (characters.length !== input.characterIds.length) {
          throw createError.badRequest('Some characters not found or do not belong to you');
        }

        // Update characters to link to this lorebook
        await prisma.character.updateMany({
          where: {
            id: { in: input.characterIds },
            userId,
          },
          data: {
            lorebookId: id,
          },
        });
      }
    }

    // Handle persona linking if provided
    if (input.personaIds !== undefined) {
      // First, unlink all personas currently linked to this lorebook
      await prisma.persona.updateMany({
        where: {
          lorebookId: id,
          userId, // Only unlink personas belonging to this user
        },
        data: {
          lorebookId: null,
        },
      });

      // Then, link the new personas if any
      if (input.personaIds.length > 0) {
        // Verify all personas belong to the user
        const personas = await prisma.persona.findMany({
          where: {
            id: { in: input.personaIds },
            userId,
          },
        });

        if (personas.length !== input.personaIds.length) {
          throw createError.badRequest('Some personas not found or do not belong to you');
        }

        // Update personas to link to this lorebook
        await prisma.persona.updateMany({
          where: {
            id: { in: input.personaIds },
            userId,
          },
          data: {
            lorebookId: id,
          },
        });
      }
    }

    // Fetch lorebook with entries
    const lorebookWithEntries = await lorebookRepository.findLorebookById(id);
    if (!lorebookWithEntries) {
      throw createError.notFound('Lorebook not found after update');
    }

    const transformed = await transformEntityImageUrls(lorebookWithEntries);
    const state = await this.resolveUserState(lorebookWithEntries.id, userId);
    return { lorebook: this.withUserState(transformed, state) };
  },

  // ============================================
  // Delete Lorebook
  // ============================================

  async deleteLorebook(id: string, userId: string): Promise<MessageResponse> {
    // Verify lorebook exists and belongs to user
    const lorebook = await lorebookRepository.findLorebookById(id);

    if (!lorebook) {
      throw createError.notFound('Lorebook not found');
    }

    if (lorebook.userId !== userId) {
      throw createError.forbidden('You do not have permission to delete this lorebook');
    }

    // Delete avatar from storage
    const avatar = lorebook.avatar as { url?: string } | null;
    if (avatar?.url) await deleteUploadedImageIfExists(avatar.url);

    await lorebookRepository.deleteLorebook(id);

    return { message: 'Lorebook deleted successfully' };
  },

  // ============================================
  // Batch Delete Lorebooks
  // ============================================

  async batchDeleteLorebooks(lorebookIds: string[], userId: string): Promise<{ success: number; failed: number; errors: Array<{ id: string; error: string }> }> {
    if (!lorebookIds || lorebookIds.length === 0) {
      throw createError.badRequest('Lorebook IDs array is required and cannot be empty');
    }

    if (lorebookIds.length > 100) {
      throw createError.badRequest('Maximum 100 lorebooks can be deleted at once');
    }

    // Fetch all lorebooks and verify ownership
    const lorebooks = await Promise.all(
      lorebookIds.map((id) => lorebookRepository.findLorebookById(id))
    );

    const results = {
      success: 0,
      failed: 0,
      errors: [] as Array<{ id: string; error: string }>,
    };

    // Delete lorebooks in parallel (Prisma handles transactions)
    await Promise.all(
      lorebooks.map(async (lorebook, index) => {
        const lorebookId = lorebookIds[index];

        // Ensure lorebookId exists
        if (!lorebookId) {
          results.failed++;
          results.errors.push({
            id: 'unknown',
            error: 'Lorebook ID is missing',
          });
          return;
        }

        try {
          // Check if lorebook exists
          if (!lorebook) {
            results.failed++;
            results.errors.push({
              id: lorebookId,
              error: 'Lorebook not found',
            });
            return;
          }

          // Check if lorebook belongs to user
          if (lorebook.userId !== userId) {
            results.failed++;
            results.errors.push({
              id: lorebookId,
              error: 'You do not have permission to delete this lorebook',
            });
            return;
          }

          // Delete lorebook (cascade delete will handle associated entries)
          await lorebookRepository.deleteLorebook(lorebookId);
          results.success++;
        } catch (error: any) {
          results.failed++;
          results.errors.push({
            id: lorebookId,
            error: error.message || 'Unknown error occurred',
          });
        }
      })
    );

    return results;
  },

  // ============================================
  // Toggle Favourite
  // ============================================

  async toggleFavourite(id: string, userId: string): Promise<LorebookResponse> {
    const lorebook = await lorebookRepository.findLorebookById(id);

    if (!lorebook) {
      throw createError.notFound('Lorebook not found');
    }

    if (lorebook.visibility === 'private' && lorebook.userId !== userId) {
      throw createError.forbidden('You do not have permission to modify this lorebook');
    }

    const updatedLorebook = await lorebookRepository.toggleFavouriteForUser(id, userId);
    const transformed = await transformEntityImageUrls(updatedLorebook);
    const state = await this.resolveUserState(updatedLorebook.id, userId);
    return { lorebook: this.withUserState(transformed, state) };
  },

  // ============================================
  // Toggle Saved
  // ============================================

  async toggleSaved(id: string, userId: string): Promise<LorebookResponse> {
    const lorebook = await lorebookRepository.findLorebookById(id);

    if (!lorebook) {
      throw createError.notFound('Lorebook not found');
    }

    if (lorebook.visibility === 'private' && lorebook.userId !== userId) {
      throw createError.forbidden('You do not have permission to modify this lorebook');
    }

    const updatedLorebook = await lorebookRepository.toggleSavedForUser(id, userId);
    const transformed = await transformEntityImageUrls(updatedLorebook);
    const state = await this.resolveUserState(updatedLorebook.id, userId);
    return { lorebook: this.withUserState(transformed, state) };
  },

  // ============================================
  // Lorebook Entry Operations
  // ============================================

  async createEntry(
    lorebookId: string,
    userId: string,
    input: CreateLorebookEntryInput
  ): Promise<LorebookEntryResponse> {
    // Verify lorebook exists and belongs to user
    const lorebook = await lorebookRepository.findLorebookById(lorebookId);

    if (!lorebook) {
      throw createError.notFound('Lorebook not found');
    }

    if (lorebook.userId !== userId) {
      throw createError.forbidden('You do not have permission to add entries to this lorebook');
    }

    const entryData: CreateLorebookEntryData = {
      lorebookId,
      keywords: input.keywords,
      context: input.context,
      isEnabled: input.isEnabled ?? true,
      priority: input.priority ?? 0,
    };

    const entry = await lorebookRepository.createEntry(entryData);

    return { entry };
  },

  async getEntries(
    lorebookId: string,
    userId: string,
    page: number = 1,
    limit: number = 50
  ): Promise<LorebookEntryListResponse> {
    // Verify lorebook exists and belongs to user
    const lorebook = await lorebookRepository.findLorebookById(lorebookId);

    if (!lorebook) {
      throw createError.notFound('Lorebook not found');
    }

    if (lorebook.userId !== userId) {
      throw createError.forbidden('You do not have permission to view entries of this lorebook');
    }

    const { entries, total } = await lorebookRepository.findEntriesByLorebook(lorebookId, page, limit);
    const totalPages = Math.ceil(total / limit);

    return {
      entries,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  },

  async updateEntry(
    entryId: string,
    userId: string,
    input: UpdateLorebookEntryInput
  ): Promise<LorebookEntryResponse> {
    // Verify entry exists
    const entry = await lorebookRepository.findEntryById(entryId);

    if (!entry) {
      throw createError.notFound('Entry not found');
    }

    // Verify lorebook belongs to user
    const lorebook = await lorebookRepository.findLorebookById(entry.lorebookId);

    if (!lorebook || lorebook.userId !== userId) {
      throw createError.forbidden('You do not have permission to update this entry');
    }

    const updateData: UpdateLorebookEntryData = {
      ...(input.keywords && { keywords: input.keywords }),
      ...(input.context && { context: input.context }),
      ...(input.isEnabled !== undefined && { isEnabled: input.isEnabled }),
      ...(input.priority !== undefined && { priority: input.priority }),
    };

    const updatedEntry = await lorebookRepository.updateEntry(entryId, updateData);

    return { entry: updatedEntry };
  },

  async deleteEntry(entryId: string, userId: string): Promise<MessageResponse> {
    // Verify entry exists
    const entry = await lorebookRepository.findEntryById(entryId);

    if (!entry) {
      throw createError.notFound('Entry not found');
    }

    // Verify lorebook belongs to user
    const lorebook = await lorebookRepository.findLorebookById(entry.lorebookId);

    if (!lorebook || lorebook.userId !== userId) {
      throw createError.forbidden('You do not have permission to delete this entry');
    }

    await lorebookRepository.deleteEntry(entryId);

    return { message: 'Entry deleted successfully' };
  },
};

export default lorebookService;

