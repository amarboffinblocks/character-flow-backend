import type { Request, Response } from 'express';
import { authService } from '../../../modules/auth/index.js';
import { sendSuccess } from '../../../utils/response.js';
import { requireCurrentUser } from '../../../middleware/auth.middleware.js';

// ============================================
// GET /api/v1/user/me
// ============================================

export const GET = async (req: Request, res: Response): Promise<void> => {
  const currentUser = requireCurrentUser(req);

  // Get full user data
  const user = await authService.getUserById(currentUser.id);

  sendSuccess(res, { user }, 'User profile retrieved successfully');
};

