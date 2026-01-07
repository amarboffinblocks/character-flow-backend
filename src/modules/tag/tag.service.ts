import { tagRepository } from './tag.repository.js';
import { createError } from '../../utils/index.js';
import type { Tag } from '@prisma/client';
import type {
  CreateTagInput,
  UpdateTagInput,
  TagQueryParams,
  TagResponse,
  TagListResponse,
  MessageResponse,
  CreateTagData,
  UpdateTagData,
} from './tag.types.js';

// ============================================
// Tag Service
// ============================================

export const tagService = {
  // ============================================
  // Create Tag
  // ============================================

  async createTag(input: CreateTagInput): Promise<TagResponse> {
    // Check if tag with same name already exists
    const existingTag = await tagRepository.findTagByName(input.name);
    if (existingTag) {
      throw createError.conflict('Tag with this name already exists');
    }

    const tagData: CreateTagData = {
      name: input.name,
      category: input.category,
      description: input.description ?? null,
    };

    const tag = await tagRepository.createTag(tagData);

    return { tag };
  },

  // ============================================
  // Get Tag by ID
  // ============================================

  async getTagById(id: string): Promise<TagResponse> {
    const tag = await tagRepository.findTagById(id);

    if (!tag) {
      throw createError.notFound('Tag not found');
    }

    return { tag };
  },

  // ============================================
  // List Tags
  // ============================================

  async listTags(params: TagQueryParams): Promise<TagListResponse> {
    const { tags, total } = await tagRepository.findTags(params);

    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const totalPages = limit > 0 ? Math.ceil(total / limit) : 1;

    return {
      tags,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  },

  // ============================================
  // Update Tag
  // ============================================

  async updateTag(id: string, input: UpdateTagInput): Promise<TagResponse> {
    // Verify tag exists
    const existingTag = await tagRepository.findTagById(id);
    if (!existingTag) {
      throw createError.notFound('Tag not found');
    }

    // If name is being updated, check if new name already exists
    if (input.name && input.name !== existingTag.name) {
      const tagWithNewName = await tagRepository.findTagByName(input.name);
      if (tagWithNewName) {
        throw createError.conflict('Tag with this name already exists');
      }
    }

    const updateData: UpdateTagData = {};

    if (input.name !== undefined) {
      updateData.name = input.name;
    }

    if (input.category !== undefined) {
      updateData.category = input.category;
    }

    if (input.description !== undefined) {
      updateData.description = input.description ?? null;
    }

    const tag = await tagRepository.updateTag(id, updateData);

    return { tag };
  },

  // ============================================
  // Delete Tag
  // ============================================

  async deleteTag(id: string): Promise<MessageResponse> {
    // Verify tag exists
    const tag = await tagRepository.findTagById(id);
    if (!tag) {
      throw createError.notFound('Tag not found');
    }

    // Check if tag is in use (usageCount > 0)
    if (tag.usageCount > 0) {
      throw createError.badRequest(
        'Cannot delete tag that is currently in use. Remove it from all characters, personas, lorebooks, and realms first.'
      );
    }

    await tagRepository.deleteTag(id);

    return { message: 'Tag deleted successfully' };
  },

  // ============================================
  // Get Popular Tags
  // ============================================

  async getPopularTags(limit: number = 10, category?: 'SFW' | 'NSFW'): Promise<{ tags: Tag[] }> {
    const tags = await tagRepository.getPopularTags(limit, category);
    return { tags };
  },

  // ============================================
  // Get or Create Tags (Helper for character/persona/lorebook creation)
  // ============================================

  async getOrCreateTags(tagNames: string[], category: 'SFW' | 'NSFW'): Promise<Tag[]> {
    if (!tagNames || tagNames.length === 0) {
      return [];
    }

    const normalizedNames = tagNames.map((name) => name.toLowerCase().trim()).filter(Boolean);
    
    if (normalizedNames.length === 0) {
      return [];
    }

    // Find existing tags
    const existingTags = await tagRepository.findTagsByNames(normalizedNames);
    const existingTagNames = new Set(existingTags.map((tag) => tag.name));

    // Create missing tags
    const tagsToCreate = normalizedNames.filter((name) => !existingTagNames.has(name));
    const newTags: Tag[] = [];

    for (const name of tagsToCreate) {
      const newTag = await tagRepository.createTag({
        name,
        category,
        description: null,
      });
      newTags.push(newTag);
    }

    // Increment usage count for all tags
    for (const name of normalizedNames) {
      await tagRepository.incrementUsageCount(name);
    }

    return [...existingTags, ...newTags];
  },
};

