import type { Request, Response } from 'express';
import { lorebookService, updateLorebookSchema } from '../../../modules/lorebook/index.js';
import { sendSuccess } from '../../../utils/response.js';
import { requireCurrentUser } from '../../../middleware/auth.middleware.js';
import type { AuthenticatedRequest } from '../../../types/index.js';

// ============================================
// GET /api/v1/lorebooks/:id - Get Lorebook By ID
// ============================================

export const GET = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  if (!id) {
    throw new Error('Lorebook ID is required');
  }
  const user = (req as AuthenticatedRequest).user;
  
  const result = await lorebookService.getLorebookById(id, user?.id);
  sendSuccess(res, result, 'Lorebook retrieved successfully');
};

// ============================================
// PUT /api/v1/lorebooks/:id - Update Lorebook
// ============================================

export const PUT = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  if (!id) {
    throw new Error('Lorebook ID is required');
  }
  const user = requireCurrentUser(req);
  
  // Validate request body
  const validatedData = updateLorebookSchema.parse(req.body);
  
  // Update lorebook
  const result = await lorebookService.updateLorebook(id, user.id, validatedData);
  
  sendSuccess(res, result, 'Lorebook updated successfully');
};

// ============================================
// DELETE /api/v1/lorebooks/:id - Delete Lorebook
// ============================================

export const DELETE = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  if (!id) {
    throw new Error('Lorebook ID is required');
  }
  const user = requireCurrentUser(req);
  
  // Delete lorebook
  const result = await lorebookService.deleteLorebook(id, user.id);
  
  sendSuccess(res, result, result.message);
};

