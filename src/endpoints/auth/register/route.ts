import type { Request, Response } from 'express';
import { authService, registerSchema } from '../../../modules/auth/index.js';
import { sendCreated } from '../../../utils/response.js';

// ============================================
// POST /api/v1/auth/register
// ============================================

export const POST = async (req: Request, res: Response): Promise<void> => {
  // Validate request body
  const validatedData = registerSchema.parse(req.body);

  // Register user
  const result = await authService.register(validatedData);
  

  sendCreated(res, result, result.message);
};

