import type { Request, Response } from 'express';
import { ZodError } from 'zod';
import { modelService, updateModelSchema } from '../../../modules/model/index.js';
import { sendSuccess, sendError } from '../../../utils/response.js';
import { createError } from '../../../utils/index.js';
import { logger } from '../../../lib/logger.js';
import type { Model } from '../../../modules/model/model.types.js';
import { parseModelConfig } from '../../../modules/model/model.types.js';

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
// GET /api/v1/models/:id - Get Specific Model
// ============================================

export const GET = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  if (!id) {
    throw createError.badRequest('Model ID is required');
  }
  const result = await modelService.getModelById(id);
  const data = { model: serializeModel(result.model as Model | Record<string, unknown>) };
  sendSuccess(res, data, 'Model retrieved successfully');
};

// ============================================
// PATCH /api/v1/models/:id - Update Model (including config)
// ============================================

export const PATCH = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  if (!id) {
    throw createError.badRequest('Model ID is required');
  }
  try {
    const body = req.body ?? {};
    const validated = updateModelSchema.parse(body);
    const result = await modelService.updateModel(id, validated);
    const data = { model: serializeModel(result.model as Model | Record<string, unknown>) };
    sendSuccess(res, data, 'Model updated successfully');
  } catch (error) {
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
      'PATCH /api/v1/models/:id failed'
    );
    throw error;
  }
};
