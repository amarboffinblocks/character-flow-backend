import type { Request, Response } from 'express';
import { modelService, modelQuerySchema } from '../../modules/model/index.js';
import { sendSuccess } from '../../utils/response.js';

// ============================================
// GET /api/v1/models - List All Models
// ============================================

export const GET = async (req: Request, res: Response): Promise<void> => {
  const queryParams = modelQuerySchema.parse(req.query);
  const result = await modelService.getAllModels(queryParams);
  sendSuccess(res, result, 'Models retrieved successfully');
};
