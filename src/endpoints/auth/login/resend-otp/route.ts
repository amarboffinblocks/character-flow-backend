import type { Request, Response } from 'express';
import { authService, requestOtpSchema } from '../../../../modules/auth/index.js';
import { sendSuccess } from '../../../../utils/response.js';

// ============================================
// POST /api/v1/auth/login/resend-otp
// Resend OTP for login
// ============================================

export const POST = async (req: Request, res: Response): Promise<void> => {
  // Validate request body
  const validatedData = requestOtpSchema.parse(req.body);

  // Resend OTP
  const result = await authService.requestOtp(validatedData);

  sendSuccess(res, result, result.message);
};

