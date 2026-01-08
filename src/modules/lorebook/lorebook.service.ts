import { lorebookRepository } from './lorebook.repository.js';
import { generateSlug } from '../../utils/helpers.js';
import { createError } from '../../utils/index.js';
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
// Lorebook Service
// ============================================

export const lorebookService = {
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

    const lorebookData: CreateLorebookData = {
      userId,
      name: input.name,
      slug,
      description: input.description ?? null,
      rating: input.rating ?? 'SFW',
      visibility: input.visibility ?? 'private',
      avatar: input.avatar ?? null,
      tags: input.tags ?? [],
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

    // Fetch lorebook with entries
    const lorebookWithEntries = await lorebookRepository.findLorebookById(lorebook.id);
    if (!lorebookWithEntries) {
      throw createError.notFound('Lorebook not found after creation');
    }

    return { lorebook: lorebookWithEntries };
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

    return { lorebook };
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

    return { lorebook };
  },

  // ============================================
  // Get User's Lorebooks
  // ============================================

  async getUserLorebooks(userId: string, params: LorebookQueryParams): Promise<LorebookListResponse> {
    const { lorebooks, total } = await lorebookRepository.findLorebooksByUser(userId, params);

    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const totalPages = Math.ceil(total / limit);

    return {
      lorebooks,
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

  async getPublicLorebooks(params: LorebookQueryParams): Promise<LorebookListResponse> {
    const { lorebooks, total } = await lorebookRepository.findPublicLorebooks(params);

    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const totalPages = Math.ceil(total / limit);

    return {
      lorebooks,
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

    const updateData: UpdateLorebookData = {
      ...(input.name && { name: input.name }),
      ...(slug && { slug }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.rating && { rating: input.rating }),
      ...(input.visibility && { visibility: input.visibility }),
      ...(input.avatar !== undefined && { avatar: input.avatar }),
      ...(input.tags !== undefined && { tags: input.tags }),
      ...(input.isFavourite !== undefined && { isFavourite: input.isFavourite }),
      ...(input.isSaved !== undefined && { isSaved: input.isSaved }),
    };

    const lorebook = await lorebookRepository.updateLorebook(id, updateData);

    return { lorebook };
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

    await lorebookRepository.deleteLorebook(id);

    return { message: 'Lorebook deleted successfully' };
  },

  // ============================================
  // Toggle Favourite
  // ============================================

  async toggleFavourite(id: string, userId: string): Promise<LorebookResponse> {
    const lorebook = await lorebookRepository.findLorebookById(id);

    if (!lorebook) {
      throw createError.notFound('Lorebook not found');
    }

    if (lorebook.userId !== userId) {
      throw createError.forbidden('You do not have permission to modify this lorebook');
    }

    const updatedLorebook = await lorebookRepository.updateLorebook(id, {
      isFavourite: !lorebook.isFavourite,
    });

    return { lorebook: updatedLorebook };
  },

  // ============================================
  // Toggle Saved
  // ============================================

  async toggleSaved(id: string, userId: string): Promise<LorebookResponse> {
    const lorebook = await lorebookRepository.findLorebookById(id);

    if (!lorebook) {
      throw createError.notFound('Lorebook not found');
    }

    if (lorebook.userId !== userId) {
      throw createError.forbidden('You do not have permission to modify this lorebook');
    }

    const updatedLorebook = await lorebookRepository.updateLorebook(id, {
      isSaved: !lorebook.isSaved,
    });

    return { lorebook: updatedLorebook };
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

