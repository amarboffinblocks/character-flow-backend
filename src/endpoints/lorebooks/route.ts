import type { Request, Response } from 'express';
import { lorebookService, lorebookQuerySchema, createLorebookSchema } from '../../modules/lorebook/index.js';
import { sendSuccess } from '../../utils/response.js';
import { requireCurrentUser } from '../../middleware/auth.middleware.js';
import type { AuthenticatedRequest } from '../../types/index.js';

// ============================================
// GET /api/v1/lorebooks - List Lorebooks
// ============================================

export const GET = async (req: Request, res: Response): Promise<void> => {
  // Parse query parameters
  const queryParams = lorebookQuerySchema.parse(req.query);
  
  // Get current user if authenticated
  const user = (req as AuthenticatedRequest).user;
  
  if (user) {
    // If authenticated, get user's lorebooks
    const result = await lorebookService.getUserLorebooks(user.id, queryParams);
    sendSuccess(res, result, 'Lorebooks retrieved successfully');
  } else {
    // If not authenticated, get public lorebooks
    const result = await lorebookService.getPublicLorebooks(queryParams);
    sendSuccess(res, result, 'Public lorebooks retrieved successfully');
  }
};

// ============================================
// POST /api/v1/lorebooks - Create Lorebook
// ============================================

export const POST = async (req: Request, res: Response): Promise<void> => {
  const user = requireCurrentUser(req);
  
  // Validate request body
  const validatedData = createLorebookSchema.parse(req.body);
  
  // Convert null to undefined for optional fields to match CreateLorebookInput type
  const input = {
    ...validatedData,
    description: validatedData.description ?? undefined,
    avatar: validatedData.avatar ?? undefined,
  };
  
  // Create lorebook
  const result = await lorebookService.createLorebook(user.id, input);
  
  sendSuccess(res, result, 'Lorebook created successfully', 201);
};

