import type { Request, Response } from 'express';
import { personaService } from '../../../../modules/persona/index.js';
import { sendSuccess } from '../../../../utils/response.js';
import { requireCurrentUser } from '../../../../middleware/auth.middleware.js';

// ============================================
// PATCH /api/v1/personas/:id/saved - Toggle Saved
// ============================================

export const PATCH = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  if (!id) {
    throw new Error('Persona ID is required');
  }
  const user = requireCurrentUser(req);
  
  const result = await personaService.toggleSaved(id, user.id);
  sendSuccess(res, result, 'Persona saved status updated successfully');
};
