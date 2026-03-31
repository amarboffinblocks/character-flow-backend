import { backgroundRepository } from './background.repository.js';
import { transformEntitiesImageUrls, transformEntityImageUrls } from '../../lib/cloudinary.service.js';
import { createError } from '../../utils/index.js';
import type {
  CreateBackgroundInput,
  UpdateBackgroundInput,
  BackgroundQueryParams,
  BackgroundResponse,
  BackgroundListResponse,
} from './background.types.js';

// ============================================
// Background Service
// ============================================

export const backgroundService = {
  async listBackgrounds(userId: string, params: BackgroundQueryParams): Promise<BackgroundListResponse> {
    const { page = 1, limit = 20 } = params;

    const { backgrounds, total } = await backgroundRepository.findByUser(userId, params);

    const totalPages = Math.ceil(total / limit);

    return {
      backgrounds: await transformEntitiesImageUrls(backgrounds),
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  },

  async getBackgroundById(id: string, userId: string): Promise<BackgroundResponse> {
    const background = await backgroundRepository.findById(id);

    if (!background) {
      throw createError.notFound('Background not found');
    }

    if (background.userId !== userId) {
      throw createError.forbidden('Access denied');
    }

    return { background: await transformEntityImageUrls(background) };
  },

  async createBackground(userId: string, input: CreateBackgroundInput): Promise<BackgroundResponse> {
    const background = await backgroundRepository.create({
      userId,
      name: input.name ?? null,
      description: input.description ?? null,
      image: input.image,
      tags: input.tags ?? [],
      rating: input.rating ?? 'SFW',
    });

    return { background: await transformEntityImageUrls(background) };
  },

  async updateBackground(
    id: string,
    userId: string,
    input: UpdateBackgroundInput
  ): Promise<BackgroundResponse> {
    const existing = await backgroundRepository.findById(id);

    if (!existing) {
      throw createError.notFound('Background not found');
    }

    if (existing.userId !== userId) {
      throw createError.forbidden('Access denied');
    }

    const background = await backgroundRepository.update(id, {
      name: input.name,
      description: input.description,
      tags: input.tags,
      rating: input.rating,
    });

    return { background: await transformEntityImageUrls(background) };
  },

  async deleteBackground(id: string, userId: string): Promise<void> {
    const existing = await backgroundRepository.findById(id);

    if (!existing) {
      throw createError.notFound('Background not found');
    }

    if (existing.userId !== userId) {
      throw createError.forbidden('Access denied');
    }

    await backgroundRepository.delete(id);
  },

  async setGlobalDefault(id: string, userId: string): Promise<BackgroundResponse> {
    const existing = await backgroundRepository.findById(id);

    if (!existing) {
      throw createError.notFound('Background not found');
    }

    if (existing.userId !== userId) {
      throw createError.forbidden('Access denied');
    }

    const background = await backgroundRepository.setGlobalDefault(userId, id);

    return { background: await transformEntityImageUrls(background) };
  },

  async clearGlobalDefault(userId: string): Promise<void> {
    await backgroundRepository.clearGlobalDefault(userId);
  },

  async importBackground(
    userId: string,
    imageMetadata: { url: string; width?: number; height?: number }
  ): Promise<BackgroundResponse> {
    const background = await backgroundRepository.create({
      userId,
      name: null,
      description: null,
      image: imageMetadata,
      tags: [],
      rating: 'SFW',
    });
    return { background: await transformEntityImageUrls(background) };
  },

  async bulkImportBackgrounds(
    userId: string,
    imageMetadataList: Array<{ url: string; width?: number; height?: number }>
  ): Promise<{ imported: number; failed: number; backgrounds: Awaited<ReturnType<typeof backgroundRepository.create>>[]; errors: Array<{ index: number; error: string }> }> {
    const backgrounds: Awaited<ReturnType<typeof backgroundRepository.create>>[] = [];
    const errors: Array<{ index: number; error: string }> = [];
    let failed = 0;

    for (let i = 0; i < imageMetadataList.length; i++) {
      const metadata = imageMetadataList[i];
      if (!metadata) continue;
      try {
        const bg = await backgroundRepository.create({
          userId,
          name: null,
          description: null,
          image: metadata,
          tags: [],
          rating: 'SFW',
        });
        backgrounds.push(bg);
      } catch (err) {
        failed++;
        errors.push({ index: i, error: err instanceof Error ? err.message : 'Unknown error' });
      }
    }

    return {
      imported: backgrounds.length,
      failed,
      backgrounds: await transformEntitiesImageUrls(backgrounds),
      errors,
    };
  },
};
