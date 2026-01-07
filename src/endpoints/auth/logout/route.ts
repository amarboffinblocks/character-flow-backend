import type { Request, Response } from 'express';
import { authService, refreshSchema } from '../../../modules/auth/index.js';
import { sendSuccess } from '../../../utils/response.js';

// ============================================
// POST /api/v1/auth/logout
// ============================================

export const POST = async (req: Request, res: Response): Promise<void> => {
  // Validate request body
  const { refreshToken } = refreshSchema.parse(req.body);

  // Logout
  const result = await authService.logout(refreshToken);

  sendSuccess(res, result, result.message);
};

