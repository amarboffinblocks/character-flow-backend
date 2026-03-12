import type { Request, Response } from 'express';
import { ZodError } from 'zod';
import { modelService, modelQuerySchema, createModelSchema } from '../../modules/model/index.js';
import { sendSuccess } from '../../utils/response.js';
import { sendError } from '../../utils/response.js';
import { logger } from '../../lib/logger.js';
import type { Model } from '../../modules/model/model.types.js';
import { parseModelConfig } from '../../modules/model/model.types.js';

// Serialize model for JSON response (avoids BigInt/custom types from DB breaking res.json())
// Defensive for production: Prisma may return Date or ISO string depending on driver/config
function serializeModel(m: Model | Record<string, unknown>) {
  const raw = m as Record<string, unknown>;
  const toDate = (v: unknown): string =>
    v instanceof Date ? v.toISOString() : typeof v === 'string' ? v : String(v ?? '');
  return {
    id: raw.id ?? '',
    name: raw.name ?? '',
    slug: raw.slug ?? '',
    description: raw.description ?? null,
    provider: raw.provider ?? 'aws',
    modelName: raw.modelName ?? null,
    isActive: Boolean(raw.isActive),
    isDefault: Boolean(raw.isDefault),
    metadata: raw.metadata ?? null,
    config: parseModelConfig(raw.metadata),
    createdAt: toDate(raw.createdAt),
    updatedAt: toDate(raw.updatedAt),
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
    const body = req.body ?? {};
    const validated = createModelSchema.parse(body);
    const result = await modelService.createModel(validated);
    const data = { model: serializeModel(result.model as Model | Record<string, unknown>) };
    sendSuccess(res, data, 'Model created successfully', 201);
  } catch (error) {
    // Catch ZodError by instance or by shape (production bundles can break instanceof)
    const issues = (error as { issues?: Array<{ path?: unknown[]; message?: string; code?: string }> }).issues;
    if (error instanceof ZodError || (Array.isArray(issues) && issues.length > 0)) {
      const zodError = error as ZodError;
      const details = (zodError.issues || issues || []).map((err: { path?: unknown[]; message?: string; code?: string }) => ({
        field: (err.path || []).join('.'),
        message: err.message || 'Validation error',
        code: err.code || 'invalid_type',
      }));
      sendError(res, 'Validation failed. Please check your input.', 'VALIDATION_ERROR', 422, details);
      return;
    }
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error(
      { err: error, path: req.path, method: req.method, message: err.message, body: req.body },
      'POST /api/v1/models failed'
    );
    throw error;
  }
};
