import type { Request, Response } from 'express';
import { backgroundService, updateBackgroundSchema } from '../../../modules/background/index.js';
import { sendSuccess } from '../../../utils/response.js';
import { requireCurrentUser } from '../../../middleware/auth.middleware.js';

// ============================================
// GET /api/v1/backgrounds/:id - Get Background By ID
// ============================================

export const GET = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  if (!id) {
    throw new Error('Background ID is required');
  }
  const user = requireCurrentUser(req);

  const result = await backgroundService.getBackgroundById(id, user.id);
  sendSuccess(res, result, 'Background retrieved successfully');
};

// ============================================
// PUT /api/v1/backgrounds/:id - Update Background
// ============================================

export const PUT = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  if (!id) {
    throw new Error('Background ID is required');
  }
  const user = requireCurrentUser(req);

  const bodyData = req.body;
  const validatedData = updateBackgroundSchema.parse(bodyData);

  const result = await backgroundService.updateBackground(id, user.id, {
    name: validatedData.name ?? undefined,
    description: validatedData.description ?? undefined,
    tags: validatedData.tags,
    rating: validatedData.rating,
  });

  sendSuccess(res, result, 'Background updated successfully');
};

// ============================================
// DELETE /api/v1/backgrounds/:id - Delete Background
// ============================================

export const DELETE = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  if (!id) {
    throw new Error('Background ID is required');
  }
  const user = requireCurrentUser(req);

  await backgroundService.deleteBackground(id, user.id);
  sendSuccess(res, { message: 'Background deleted successfully' }, 'Background deleted successfully');
};
