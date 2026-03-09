import type { Request, Response } from 'express';
import { ZodError } from 'zod';
import { modelService, modelQuerySchema, createModelSchema } from '../../modules/model/index.js';
import { sendSuccess } from '../../utils/response.js';
import { sendError } from '../../utils/response.js';
import { logger } from '../../lib/logger.js';
import type { Model } from '../../modules/model/model.types.js';

// Serialize model for JSON response (avoids BigInt/custom types from DB breaking res.json())
function serializeModel(m: Model) {
  return {
    id: m.id,
    name: m.name,
    slug: m.slug,
    description: m.description,
    provider: m.provider,
    modelName: m.modelName,
    isActive: m.isActive,
    isDefault: m.isDefault,
    metadata: m.metadata,
    createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : m.createdAt,
    updatedAt: m.updatedAt instanceof Date ? m.updatedAt.toISOString() : m.updatedAt,
  };
}

// ============================================
// GET /api/v1/models - List All Models
// ============================================

export const GET = async (req: Request, res: Response): Promise<void> => {
  try {
    const queryParams = modelQuerySchema.parse(req.query);
    const result = await modelService.getAllModels(queryParams);
    const data = { models: result.models.map(serializeModel) };
    sendSuccess(res, data, 'Models retrieved successfully');
  } catch (error) {
    if (error instanceof ZodError) {
      const zodError = error as ZodError;
      const details = (zodError.issues || []).map((err) => ({
        field: (err.path || []).join('.'),
        message: err.message || 'Validation error',
        code: err.code || 'invalid_type',
      }));
      sendError(res, 'Validation failed. Please check your input.', 'VALIDATION_ERROR', 422, details);
      return;
    }
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error(
      { err: error, path: req.path, method: req.method, message: err.message },
      'GET /api/v1/models failed'
    );
    throw error;
  }
};

// ============================================
// POST /api/v1/models - Create Model
// ============================================

export const POST = async (req: Request, res: Response): Promise<void> => {
  try {
    const validated = createModelSchema.parse(req.body);
    const result = await modelService.createModel(validated);
    sendSuccess(res, result, 'Model created successfully', 201);
  } catch (error) {
    if (error instanceof ZodError) {
      const zodError = error as ZodError;
      const details = (zodError.issues || []).map((err) => ({
        field: (err.path || []).join('.'),
        message: err.message || 'Validation error',
        code: err.code || 'invalid_type',
      }));
      sendError(res, 'Validation failed. Please check your input.', 'VALIDATION_ERROR', 422, details);
      return;
    }
    throw error;
  }
};
