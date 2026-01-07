import type { Request, Response } from 'express';
import { usernameService } from '../../../../modules/auth/index.js';
import { sendSuccess } from '../../../../utils/response.js';
import { createError } from '../../../../utils/errors.js';

// ============================================
// GET /api/v1/auth/username/check
// Check username availability (instantaneous)
// ============================================

export const GET = async (req: Request, res: Response): Promise<void> => {
  const username = req.query.username as string;

  if (!username) {
    throw createError.badRequest('Username query parameter is required');
  }

  // Validate format first
  const formatValidation = usernameService.validateFormat(username);
  if (!formatValidation.valid) {
    sendSuccess(
      res,
      {
        available: false,
        username,
        errors: formatValidation.errors,
      },
      'Username format validation failed'
    );
    return;
  }

  // Check availability
  const result = await usernameService.checkAvailability(username);

  sendSuccess(res, result, result.available ? 'Username is available' : 'Username is already taken');
};

