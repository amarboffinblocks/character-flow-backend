import type { Request, Response } from 'express';
import { tagService, updateTagSchema } from '../../../modules/tag/index.js';
import { sendSuccess } from '../../../utils/response.js';
import { requireCurrentUser } from '../../../middleware/auth.middleware.js';

// ============================================
// GET /api/v1/tags/:id - Get Tag by ID
// ============================================

export const GET = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  if (!id) {
    throw new Error('Tag ID is required');
  }

  const result = await tagService.getTagById(id);
  sendSuccess(res, result, 'Tag retrieved successfully');
};

// ============================================
// PUT /api/v1/tags/:id - Update Tag
// ============================================

export const PUT = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  if (!id) {
    throw new Error('Tag ID is required');
  }

  const user = requireCurrentUser(req);

  // Validate request body
  const validatedData = updateTagSchema.parse(req.body);

  // Update tag - ensure description is undefined if null
  const tagData = {
    ...validatedData,
    description: validatedData.description ?? undefined,
  };

  // Update tag
  const result = await tagService.updateTag(id, tagData);

  sendSuccess(res, result, 'Tag updated successfully');
};

// ============================================
// DELETE /api/v1/tags/:id - Delete Tag
// ============================================

export const DELETE = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  if (!id) {
    throw new Error('Tag ID is required');
  }

  const user = requireCurrentUser(req);

  // Delete tag
  const result = await tagService.deleteTag(id);

  sendSuccess(res, result, result.message);
};

