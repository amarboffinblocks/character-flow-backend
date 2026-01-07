import type { Request, Response } from 'express';
import { authService, resetPasswordSchema } from '../../../modules/auth/index.js';
import { sendSuccess } from '../../../utils/response.js';

// ============================================
// PUT /api/v1/auth/reset-password
// ============================================

export const PUT = async (req: Request, res: Response): Promise<void> => {
  // Validate request body
  const { token, password } = resetPasswordSchema.parse(req.body);

  // Reset password
  const result = await authService.resetPassword(token, password);

  sendSuccess(res, result, result.message);
};

