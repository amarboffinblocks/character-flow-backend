import type { Request, Response } from 'express';
import { folderService, updateFolderSchema } from '../../../modules/folder/index.js';
import { sendSuccess } from '../../../utils/response.js';
import { requireCurrentUser } from '../../../middleware/auth.middleware.js';

// ============================================
// GET /api/v1/folders/:id - Get Folder By ID
// ============================================

export const GET = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  if (!id) {
    throw new Error('Folder ID is required');
  }
  const user = requireCurrentUser(req);

  const result = await folderService.getFolderById(id, user.id);
  sendSuccess(res, result, 'Folder retrieved successfully');
};

// ============================================
// PUT /api/v1/folders/:id - Update Folder
// ============================================

export const PUT = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  if (!id) {
    throw new Error('Folder ID is required');
  }
  const user = requireCurrentUser(req);

  // Validate request body
  const validatedData = updateFolderSchema.parse(req.body);

  // Update folder
  const result = await folderService.updateFolder(id, user.id, {
    name: validatedData.name,
    description: validatedData.description ?? undefined,
    color: validatedData.color ?? undefined,
  });

  sendSuccess(res, result, 'Folder updated successfully');
};

// ============================================
// DELETE /api/v1/folders/:id - Delete Folder
// ============================================

export const DELETE = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  if (!id) {
    throw new Error('Folder ID is required');
  }
  const user = requireCurrentUser(req);

  // Delete folder
  const result = await folderService.deleteFolder(id, user.id);

  sendSuccess(res, result, result.message);
};
