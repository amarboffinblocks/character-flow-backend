import type { Request, Response } from 'express';
import { authService, verifyOtpSchema } from '../../../../modules/auth/index.js';
import { sendSuccess } from '../../../../utils/response.js';

// ============================================
// POST /api/v1/auth/login/verify-otp
// Step 2: Verify OTP and complete login
// ============================================

export const POST = async (req: Request, res: Response): Promise<void> => {
  // Validate request body
  const validatedData = verifyOtpSchema.parse(req.body);

  // Get request metadata
  const meta = {
    userAgent: req.headers['user-agent'],
    ipAddress: req.ip || req.headers['x-forwarded-for']?.toString(),
  };

  // Step 2: Verify OTP and complete login
  const result = await authService.loginStep2(validatedData, meta);

  sendSuccess(res, result, 'Login successful');
};

