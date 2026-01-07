import type { Request, Response } from 'express';
import { authService, verifyEmailSchema } from '../../../modules/auth/index.js';
import { sendSuccess } from '../../../utils/response.js';

// ============================================
// GET /api/v1/auth/verify?token=xxx
// ============================================

export const GET = async (req: Request, res: Response): Promise<void> => {
  // Validate query params
  const { token } = verifyEmailSchema.parse({ token: req.query.token });

  // Verify email
  const result = await authService.verifyEmail(token);

  sendSuccess(res, result, result.message);
};

