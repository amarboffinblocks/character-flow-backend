import type { Request, Response } from 'express';
import { characterService } from '../../../../modules/character/index.js';
import { sendSuccess } from '../../../../utils/response.js';
import { requireCurrentUser } from '../../../../middleware/auth.middleware.js';

// ============================================
// PATCH /api/v1/characters/:id/saved - Toggle Saved
// ============================================

export const PATCH = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  if (!id) {
    throw new Error('Character ID is required');
  }
  const user = requireCurrentUser(req);
  
  const result = await characterService.toggleSaved(id, user.id);
  sendSuccess(res, result, 'Character saved status updated successfully');
};

