import type { Request, Response } from 'express';
import { lorebookService } from '../../../../modules/lorebook/index.js';
import { sendSuccess } from '../../../../utils/response.js';
import type { AuthenticatedRequest } from '../../../../types/index.js';

// ============================================
// GET /api/v1/lorebooks/slug/:slug - Get Lorebook By Slug
// ============================================

export const GET = async (req: Request, res: Response): Promise<void> => {
  const { slug } = req.params;
  if (!slug) {
    throw new Error('Lorebook slug is required');
  }
  const user = (req as AuthenticatedRequest).user;
  
  const result = await lorebookService.getLorebookBySlug(slug, user?.id);
  sendSuccess(res, result, 'Lorebook retrieved successfully');
};

