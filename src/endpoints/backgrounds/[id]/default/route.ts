import type { Request, Response } from 'express';
import { backgroundService } from '../../../../modules/background/index.js';
import { sendSuccess } from '../../../../utils/response.js';
import { requireCurrentUser } from '../../../../middleware/auth.middleware.js';

// ============================================
// POST /api/v1/backgrounds/:id/default - Set Global Default
// ============================================

export const POST = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  if (!id) {
    throw new Error('Background ID is required');
  }
  const user = requireCurrentUser(req);

  await backgroundService.setGlobalDefault(id, user.id);
  sendSuccess(res, { message: 'Background set as global default' }, 'Background set as global default');
};

// ============================================
// DELETE /api/v1/backgrounds/:id/default - Clear Global Default
// ============================================

export const DELETE = async (req: Request, res: Response): Promise<void> => {
  const user = requireCurrentUser(req);

  await backgroundService.clearGlobalDefault(user.id);
  sendSuccess(res, { message: 'Global default background cleared' }, 'Global default background cleared');
};
