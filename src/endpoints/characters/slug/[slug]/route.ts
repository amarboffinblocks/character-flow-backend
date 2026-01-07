import type { Request, Response } from 'express';
import { characterService } from '../../../../modules/character/index.js';
import { sendSuccess } from '../../../../utils/response.js';
import type { AuthenticatedRequest } from '../../../../types/index.js';

// ============================================
// GET /api/v1/characters/slug/:slug - Get Character By Slug
// ============================================

export const GET = async (req: Request, res: Response): Promise<void> => {
  const { slug } = req.params;
  if (!slug) {
    throw new Error('Character slug is required');
  }
  const user = (req as AuthenticatedRequest).user;
  
  const result = await characterService.getCharacterBySlug(slug, user?.id);
  sendSuccess(res, result, 'Character retrieved successfully');
};

