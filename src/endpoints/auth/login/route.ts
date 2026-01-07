import type { Request, Response } from 'express';
import { authService, loginSchema } from '../../../modules/auth/index.js';
import { sendSuccess } from '../../../utils/response.js';

// ============================================
// POST /api/v1/auth/login
// Step 1: Verify credentials and request OTP
// ============================================

export const POST = async (req: Request, res: Response): Promise<void> => {
  // Validate request body
  const validatedData = loginSchema.parse(req.body);

  // Step 1: Verify credentials and send OTP
  const result = await authService.loginStep1(validatedData);

  sendSuccess(res, result, result.message);
};
