import type { Request, Response } from 'express';
import { authService, resendVerificationEmailSchema } from '../../../modules/auth/index.js';
import { sendSuccess } from '../../../utils/response.js';

// ============================================
// POST /api/v1/auth/resend-verification
// ============================================

export const POST = async (req: Request, res: Response): Promise<void> => {
  // Validate request body
  const { email } = resendVerificationEmailSchema.parse(req.body);

  // Resend verification email
  const result = await authService.resendVerificationEmail(email);

  sendSuccess(res, result, result.message);
};

