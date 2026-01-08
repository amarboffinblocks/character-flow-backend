import { personaRepository } from './persona.repository.js';
import { generateSlug } from '../../utils/helpers.js';
import { createError } from '../../utils/index.js';
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

    const personaData: CreatePersonaData = {
      userId,
      name: input.name,
      slug,
      description: input.description ?? null,
      rating: input.rating ?? 'SFW',
      visibility: input.visibility ?? 'private',
      avatar: input.avatar ?? null,
      backgroundImg: input.backgroundImg ?? null,
      tags: input.tags ?? [],
      lorebookId: input.lorebookId ?? null,
    };

    // Create persona
    const persona = await personaRepository.createPersona(personaData);

    // Fetch persona with relations
    const personaWithRelations = await personaRepository.findPersonaById(persona.id);
    if (!personaWithRelations) {
      throw createError.notFound('Persona not found after creation');
    }

    return { persona: personaWithRelations };
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

    return { persona };
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

    return { persona };
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
      personas,
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
      personas,
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

    return { persona: updatedPersona };
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

    return { persona: updatedPersona };
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
};
