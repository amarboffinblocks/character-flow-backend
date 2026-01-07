import type { Request, Response } from 'express';
import { lorebookService } from '../../../../modules/lorebook/index.js';
import { sendSuccess } from '../../../../utils/response.js';
import { requireCurrentUser } from '../../../../middleware/auth.middleware.js';

// ============================================
// PATCH /api/v1/lorebooks/:id/saved - Toggle Saved
// ============================================

export const PATCH = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  if (!id) {
    throw new Error('Lorebook ID is required');
  }
  const user = requireCurrentUser(req);
  
  const result = await lorebookService.toggleSaved(id, user.id);
  sendSuccess(res, result, 'Lorebook saved status updated successfully');
};

