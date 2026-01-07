import type { Request, Response } from 'express';
import { authService, updateProfileSchema } from '../../../modules/auth/index.js';
import { sendSuccess } from '../../../utils/response.js';
import { requireCurrentUser } from '../../../middleware/auth.middleware.js';

// ============================================
// PUT /api/v1/user/profile
// ============================================

export const PUT = async (req: Request, res: Response): Promise<void> => {
    const currentUser = requireCurrentUser(req);

    // Validate request body
    const validatedData = updateProfileSchema.parse(req.body);

    // Update profile
    const user = await authService.updateProfile(currentUser.id, validatedData);

    sendSuccess(res, { user }, 'Profile updated successfully');
};

