import type { Request, Response } from 'express';
import { ZodError } from 'zod';
import { modelService, modelQuerySchema, createModelSchema } from '../../modules/model/index.js';
import { sendSuccess } from '../../utils/response.js';
import { sendError } from '../../utils/response.js';

// ============================================
// GET /api/v1/models - List All Models
// ============================================

export const GET = async (req: Request, res: Response): Promise<void> => {
  try {
    const queryParams = modelQuerySchema.parse(req.query);
    const result = await modelService.getAllModels(queryParams);
    sendSuccess(res, result, 'Models retrieved successfully');
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
