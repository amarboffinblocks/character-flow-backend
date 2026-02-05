import type { Request, Response } from 'express';
import { modelService } from '../../../modules/model/index.js';
import { sendSuccess } from '../../../utils/response.js';

// ============================================
// GET /api/v1/models/:id - Get Specific Model
// ============================================

export const GET = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  if (!id) throw new Error('Model ID is required');
  const result = await modelService.getModelById(id);
  sendSuccess(res, result, 'Model retrieved successfully');
};
