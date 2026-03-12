import { personaRepository } from './persona.repository.js';
import { tagService } from '../tag/index.js';
import { generateSlug } from '../../utils/helpers.js';
import { createError } from '../../utils/index.js';
import { processImageUpload } from '../../utils/image.helper.js';
import {
  deleteFromS3IfExists,
  transformEntityImageUrls,
  transformEntitiesImageUrls,
} from '../../lib/s3.service.js';
import type {
  CreatePersonaInput,
  UpdatePersonaInput,
  PersonaQueryParams,
  PersonaResponse,
  PersonaListResponse,
  MessageResponse,
  CreatePersonaData,
  UpdatePersonaData,
} from './persona.types.js';
import type { Persona } from '@prisma/client';

// ============================================
// Persona Service
// ============================================

export const personaService = {
  // ============================================
  // Create Persona
  // ============================================

  async createPersona(userId: string, input: CreatePersonaInput): Promise<PersonaResponse> {
    // Generate unique slug
    let slug = generateSlug(input.name);
    let attempts = 0;
    const maxAttempts = 10;

    // Ensure slug is unique
    while (await personaRepository.checkSlugExists(slug)) {
      attempts++;
      if (attempts >= maxAttempts) {
        throw createError.internal('Failed to generate unique slug');
      }
      slug = generateSlug(input.name);
    }

    // Validate related entities if provided
    if (input.lorebookId) {
      // Verify lorebook exists (you can add ownership check if needed)
      // For now, we'll let Prisma handle foreign key constraints
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

    const personaData: CreatePersonaData = {
      userId,
      name: input.name,
      slug,
      description: input.description ?? null,
      rating: input.rating ?? 'SFW',
      visibility: input.visibility ?? 'private',
      avatar: input.avatar ?? null,
      backgroundImg: input.backgroundImg ?? null,
      tags: normalizedCreateTags,
      lorebookId: input.lorebookId ?? null,
    };

    // Create persona
    const persona = await personaRepository.createPersona(personaData);

    // Fetch persona with relations
    const personaWithRelations = await personaRepository.findPersonaById(persona.id);
    if (!personaWithRelations) {
      throw createError.notFound('Persona not found after creation');
    }

    return { persona: await transformEntityImageUrls(personaWithRelations) };
  },

  // ============================================
  // Get Persona by ID
  // ============================================

  async getPersonaById(id: string, userId?: string): Promise<PersonaResponse> {
    const persona = await personaRepository.findPersonaById(id);

    if (!persona) {
      throw createError.notFound('Persona not found');
    }

    // Check if user has access (public or owner)
    if (persona.visibility === 'private' && persona.userId !== userId) {
      throw createError.forbidden('You do not have access to this persona');
    }

    return { persona: await transformEntityImageUrls(persona) };
  },

  // ============================================
  // Get Persona by Slug
  // ============================================

  async getPersonaBySlug(slug: string, userId?: string): Promise<PersonaResponse> {
    const persona = await personaRepository.findPersonaBySlug(slug);

    if (!persona) {
      throw createError.notFound('Persona not found');
    }

    // Check if user has access (public or owner)
    if (persona.visibility === 'private' && persona.userId !== userId) {
      throw createError.forbidden('You do not have access to this persona');
    }

    return { persona: await transformEntityImageUrls(persona) };
  },

  // ============================================
  // List Personas
  // ============================================

  async listPersonas(userId: string, params: PersonaQueryParams): Promise<PersonaListResponse> {
    const { page = 1, limit = 20 } = params;

    // Determine if we should fetch user's personas or public personas
    const { personas, total } = await personaRepository.findPersonasByUser(userId, params);

    const totalPages = limit > 0 ? Math.ceil(total / limit) : 1;

    return {
      personas: await transformEntitiesImageUrls(personas),
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  },

  // ============================================
  // List Public Personas
  // ============================================

  async listPublicPersonas(params: PersonaQueryParams): Promise<PersonaListResponse> {
    const { page = 1, limit = 20 } = params;

    const { personas, total } = await personaRepository.findPublicPersonas(params);

    const totalPages = limit > 0 ? Math.ceil(total / limit) : 1;

    return {
      personas: await transformEntitiesImageUrls(personas),
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  },

  // ============================================
  // Update Persona
  // ============================================

  async updatePersona(
    id: string,
    userId: string,
    input: UpdatePersonaInput
  ): Promise<PersonaResponse> {
    // Verify persona exists and belongs to user
    const existingPersona = await personaRepository.findPersonaById(id);

    if (!existingPersona) {
      throw createError.notFound('Persona not found');
    }

    if (existingPersona.userId !== userId) {
      throw createError.forbidden('You do not have permission to update this persona');
    }

    // Delete old S3 images when replacing
    if (input.avatar !== undefined && input.avatar !== null) {
      const oldAvatar = existingPersona.avatar as { url?: string } | null;
      if (oldAvatar?.url) await deleteFromS3IfExists(oldAvatar.url);
    }
    if (input.avatar === null) {
      const oldAvatar = existingPersona.avatar as { url?: string } | null;
      if (oldAvatar?.url) await deleteFromS3IfExists(oldAvatar.url);
    }
    if (input.backgroundImg !== undefined && input.backgroundImg !== null) {
      const oldBg = existingPersona.backgroundImg as { url?: string } | null;
      if (oldBg?.url) await deleteFromS3IfExists(oldBg.url);
    }
    if (input.backgroundImg === null) {
      const oldBg = existingPersona.backgroundImg as { url?: string } | null;
      if (oldBg?.url) await deleteFromS3IfExists(oldBg.url);
    }

    // Generate new slug if name is being updated
    let slug = existingPersona.slug;
    if (input.name && input.name !== existingPersona.name) {
      slug = generateSlug(input.name);
      let attempts = 0;
      const maxAttempts = 10;

      // Ensure slug is unique
      while (await personaRepository.checkSlugExists(slug)) {
        attempts++;
        if (attempts >= maxAttempts) {
          throw createError.internal('Failed to generate unique slug');
        }
        slug = generateSlug(input.name);
      }
    }

    const updateData: UpdatePersonaData = {
      ...(input.name && { name: input.name, slug }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.rating && { rating: input.rating }),
      ...(input.visibility && { visibility: input.visibility }),
      ...(input.avatar !== undefined && { avatar: input.avatar }),
      ...(input.backgroundImg !== undefined && { backgroundImg: input.backgroundImg }),
      ...(input.tags !== undefined && { tags: input.tags }),
      ...(input.lorebookId !== undefined && { lorebookId: input.lorebookId }),
      ...(input.isFavourite !== undefined && { isFavourite: input.isFavourite }),
      ...(input.isSaved !== undefined && { isSaved: input.isSaved }),
    };

    // Update persona
    await personaRepository.updatePersona(id, updateData);

    // Fetch updated persona
    const updatedPersona = await personaRepository.findPersonaById(id);
    if (!updatedPersona) {
      throw createError.notFound('Persona not found after update');
    }

    return { persona: await transformEntityImageUrls(updatedPersona) };
  },

  // ============================================
  // Delete Persona
  // ============================================

  async deletePersona(id: string, userId: string): Promise<MessageResponse> {
    // Verify persona exists and belongs to user
    const persona = await personaRepository.findPersonaById(id);

    if (!persona) {
      throw createError.notFound('Persona not found');
    }

    if (persona.userId !== userId) {
      throw createError.forbidden('You do not have permission to delete this persona');
    }

    // Delete images from S3
    const avatar = persona.avatar as { url?: string } | null;
    const backgroundImg = persona.backgroundImg as { url?: string } | null;
    if (avatar?.url) await deleteFromS3IfExists(avatar.url);
    if (backgroundImg?.url) await deleteFromS3IfExists(backgroundImg.url);

    // Delete persona
    await personaRepository.deletePersona(id);

    return { message: 'Persona deleted successfully' };
  },

  // ============================================
  // Batch Delete Personas
  // ============================================

  async batchDeletePersonas(
    personaIds: string[],
    userId: string
  ): Promise<{ deleted: number; failed: number }> {
    let deleted = 0;
    let failed = 0;

    for (const id of personaIds) {
      try {
        const persona = await personaRepository.findPersonaById(id);

        if (!persona) {
          failed++;
          continue;
        }

        if (persona.userId !== userId) {
          failed++;
          continue;
        }

        await personaRepository.deletePersona(id);
        deleted++;
      } catch (error) {
        failed++;
      }
    }

    return { deleted, failed };
  },

  // ============================================
  // Toggle Favourite
  // ============================================

  async toggleFavourite(id: string, userId: string): Promise<PersonaResponse> {
    // Verify persona exists and belongs to user
    const persona = await personaRepository.findPersonaById(id);

    if (!persona) {
      throw createError.notFound('Persona not found');
    }

    if (persona.userId !== userId) {
      throw createError.forbidden('You do not have permission to modify this persona');
    }

    // Toggle favourite
    const updatedPersona = await personaRepository.toggleFavourite(id);

    return { persona: await transformEntityImageUrls(updatedPersona) };
  },

  // ============================================
  // Toggle Saved
  // ============================================
  async toggleSaved(id: string, userId: string): Promise<PersonaResponse> {
    // Verify persona exists and belongs to user
    const persona = await personaRepository.findPersonaById(id);

    if (!persona) {
      throw createError.notFound('Persona not found');
    }

    if (persona.userId !== userId) {
      throw createError.forbidden('You do not have permission to modify this persona');
    }

    // Toggle saved
    const updatedPersona = await personaRepository.toggleSaved(id);

    return { persona: updatedPersona };
  },

  // ============================================
  // Duplicate Persona
  // ============================================

  async duplicatePersona(id: string, userId: string): Promise<PersonaResponse> {
    // Verify persona exists and belongs to user
    const persona = await personaRepository.findPersonaById(id);

    if (!persona) {
      throw createError.notFound('Persona not found');
    }

    if (persona.userId !== userId) {
      throw createError.forbidden('You do not have permission to duplicate this persona');
    }

    // Generate new name with "(Copy)" suffix
    const newName = `${persona.name} (Copy)`;
    const baseSlug = generateSlug(newName);
    let slug = baseSlug;
    let attempts = 0;
    const maxAttempts = 10;

    // Ensure slug is unique
    while (await personaRepository.checkSlugExists(slug)) {
      attempts++;
      if (attempts >= maxAttempts) {
        throw createError.internal('Failed to generate unique slug');
      }
      slug = `${baseSlug}-${attempts}`;
    }

    // Create duplicate persona data
    const personaData: CreatePersonaData = {
      userId,
      name: newName,
      slug,
      description: persona.description,
      rating: persona.rating,
      visibility: persona.visibility,
      avatar: persona.avatar as Record<string, unknown> | null,
      backgroundImg: persona.backgroundImg as Record<string, unknown> | null,
      tags: persona.tags,
      lorebookId: persona.lorebookId,
    };

    const duplicatedPersona = await personaRepository.createPersona(personaData);

    // Fetch persona with relations
    const personaWithRelations = await personaRepository.findPersonaById(duplicatedPersona.id);
    if (!personaWithRelations) {
      throw createError.notFound('Persona not found after duplication');
    }

    return { persona: await transformEntityImageUrls(personaWithRelations) };
  },

  // ============================================
  // Batch Duplicate Personas
  // ============================================

  async batchDuplicatePersonas(
    personaIds: string[],
    userId: string
  ): Promise<{ success: number; failed: number; personas: Persona[] }> {
    if (!personaIds || personaIds.length === 0) {
      throw createError.badRequest('Persona IDs array is required and cannot be empty');
    }

    if (personaIds.length > 100) {
      throw createError.badRequest('Maximum 100 personas can be duplicated at once');
    }

    const results = {
      success: 0,
      failed: 0,
      personas: [] as Persona[],
    };

    for (const id of personaIds) {
      try {
        const result = await this.duplicatePersona(id, userId);
        results.personas.push(result.persona);
        results.success++;
      } catch (error) {
        results.failed++;
      }
    }

    return {
      ...results,
      personas: await transformEntitiesImageUrls(results.personas),
    };
  },

  // ============================================
  // Import Persona
  // ============================================

  async importPersona(
    userId: string,
    personaData: any,
    avatarFile?: Express.Multer.File
  ): Promise<PersonaResponse> {
    // Validate required fields
    if (!personaData.name || typeof personaData.name !== 'string') {
      throw createError.badRequest('Persona name is required');
    }

    // Generate unique slug
    const baseSlug = generateSlug(personaData.name);
    let slug = baseSlug;
    let attempts = 0;
    const maxAttempts = 10;

    while (await personaRepository.checkSlugExists(slug)) {
      attempts++;
      if (attempts >= maxAttempts) {
        throw createError.internal('Failed to generate unique slug');
      }
      slug = `${baseSlug}-${attempts}`;
    }

    // Process avatar file if provided
    let avatar = personaData.avatar ? (typeof personaData.avatar === 'string' ? { url: personaData.avatar } : personaData.avatar) : null;

    if (avatarFile) {
      const processedImage = await processImageUpload(avatarFile, 'personas');
      if (processedImage) {
        avatar = processedImage;
      }
    }

    const tagNames = Array.isArray(personaData.tags)
      ? personaData.tags.map((t: unknown) => String(t).trim()).filter(Boolean)
      : [];
    const ratingCategory = personaData.rating === 'NSFW' ? 'NSFW' : 'SFW';
    if (tagNames.length > 0) {
      await tagService.getOrCreateTags(tagNames, ratingCategory);
    }

    // Map imported data to CreatePersonaData
    const createData: CreatePersonaData = {
      userId,
      name: personaData.name,
      slug,
      description: personaData.description ?? null,
      rating: personaData.rating ?? 'SFW',
      visibility: personaData.visibility ?? 'private',
      avatar,
      backgroundImg: personaData.backgroundImg ? (typeof personaData.backgroundImg === 'string' ? { url: personaData.backgroundImg } : personaData.backgroundImg) : null,
      tags: tagNames.length > 0 ? tagNames.map((n: string) => n.toLowerCase()) : [],
      lorebookId: null, // Don't import relationships
    };

    const persona = await personaRepository.createPersona(createData);

    // Fetch persona with relations
    const personaWithRelations = await personaRepository.findPersonaById(persona.id);
    if (!personaWithRelations) {
      throw createError.notFound('Persona not found after import');
    }

    return { persona: await transformEntityImageUrls(personaWithRelations) };
  },

  // ============================================
  // Bulk Import Personas
  // ============================================

  async bulkImportPersonas(
    userId: string,
    personasData: any[]
  ): Promise<{
    success: number;
    failed: number;
    personas: Persona[];
    errors: Array<{ name: string; error: string }>;
  }> {
    const results = {
      success: 0,
      failed: 0,
      personas: [] as Persona[],
      errors: [] as Array<{ name: string; error: string }>,
    };

    for (const personaData of personasData) {
      try {
        const result = await this.importPersona(userId, personaData);
        results.success++;
        results.personas.push(result.persona);
      } catch (error: any) {
        results.failed++;
        results.errors.push({
          name: personaData.name || 'Unknown',
          error: error.message || 'Unknown error occurred',
        });
      }
    }

    return {
      ...results,
      personas: await transformEntitiesImageUrls(results.personas),
    };
  },
};
