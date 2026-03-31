import type { Request, Response } from 'express';
import { authService } from '../../../modules/auth/index.js';
import { sendSuccess } from '../../../utils/response.js';

// ============================================
// POST /api/v1/auth/login
// Ensures default guest user exists — no credentials, no tokens
// ============================================

export const POST = async (_req: Request, res: Response): Promise<void> => {
  const result = await authService.instantLogin();
  sendSuccess(res, result, 'Entered');
};
