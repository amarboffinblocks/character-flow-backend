import { modelRepository } from './model.repository.js';
import { createError } from '../../utils/index.js';
import type {
  ModelResponse,
  ModelListResponse,
  ModelQueryParams,
  CreateModelInput,
  UpdateModelInput,
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

  async createModel(input: CreateModelInput): Promise<ModelResponse> {
    // Check if slug already exists
    const existing = await modelRepository.findModelBySlug(input.slug);
    if (existing) {
      throw createError.conflict(`Model with slug "${input.slug}" already exists`);
    }

    const model = await modelRepository.createModel(input);
    return { model };
  },

  async updateModel(id: string, input: UpdateModelInput): Promise<ModelResponse> {
    const existing = await modelRepository.findModelById(id);
    if (!existing) {
      throw createError.notFound('Model not found');
    }
    const model = await modelRepository.updateModel(id, input);
    return { model };
  },
};
