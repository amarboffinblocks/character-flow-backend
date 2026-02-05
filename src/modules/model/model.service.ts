import { modelRepository } from './model.repository.js';
import { createError } from '../../utils/index.js';
import type {
  ModelResponse,
  ModelListResponse,
  ModelQueryParams,
} from './model.types.js';

// ============================================
// Model Service
// ============================================

export const modelService = {
  async getModelById(id: string): Promise<ModelResponse> {
    const model = await modelRepository.findModelById(id);
    if (!model) {
      throw createError.notFound('Model not found');
    }
    return { model };
  },

  async getModelBySlug(slug: string): Promise<ModelResponse> {
    const model = await modelRepository.findModelBySlug(slug);
    if (!model) {
      throw createError.notFound('Model not found');
    }
    return { model };
  },

  async getAllModels(params?: ModelQueryParams): Promise<ModelListResponse> {
    const models = await modelRepository.findAllModels(params);
    return { models };
  },

  async getDefaultModel(): Promise<ModelResponse> {
    const model = await modelRepository.findDefaultModel();
    if (!model) {
      throw createError.notFound('No default model found');
    }
    return { model };
  },

  async validateModelExists(modelId: string): Promise<void> {
    const model = await modelRepository.findModelById(modelId);
    if (!model) {
      throw createError.notFound('Model not found');
    }
    if (!model.isActive) {
      throw createError.badRequest('Model is not active');
    }
  },
};
