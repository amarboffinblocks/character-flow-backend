import type { Request, Response } from 'express';
import { folderService, folderQuerySchema, createFolderSchema } from '../../modules/folder/index.js';
import { sendSuccess } from '../../utils/response.js';
import { requireCurrentUser } from '../../middleware/auth.middleware.js';

// ============================================
// GET /api/v1/folders - List Folders
// ============================================

export const GET = async (req: Request, res: Response): Promise<void> => {
  const user = requireCurrentUser(req);

  // Parse query parameters
  const queryParams = folderQuerySchema.parse(req.query);

  // Get user's folders
  const result = await folderService.getUserFolders(user.id, queryParams);

  sendSuccess(res, result, 'Folders retrieved successfully');
};

// ============================================
// POST /api/v1/folders - Create Folder
// ============================================

export const POST = async (req: Request, res: Response): Promise<void> => {
  const user = requireCurrentUser(req);

  // Validate request body
  const validatedData = createFolderSchema.parse(req.body);

  // Create folder
  const result = await folderService.createFolder(user.id, {
    name: validatedData.name,
    description: validatedData.description ?? undefined,
    color: validatedData.color ?? undefined,
  });

  sendSuccess(res, result, 'Folder created successfully', 201);
};
