import type { Request, Response } from 'express';
import { authService, forgotPasswordSchema } from '../../../modules/auth/index.js';
import { sendSuccess } from '../../../utils/response.js';

// ============================================
// POST /api/v1/auth/forgot-password
// ============================================

export const POST = async (req: Request, res: Response): Promise<void> => {
  // Validate request body
  const { email } = forgotPasswordSchema.parse(req.body);

  // Send password reset email
  const result = await authService.forgotPassword(email);

  sendSuccess(res, result, result.message);
};

