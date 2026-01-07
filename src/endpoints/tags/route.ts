import type { Request, Response } from 'express';
import { tagService, tagQuerySchema, createTagSchema } from '../../modules/tag/index.js';
import { sendSuccess } from '../../utils/response.js';
import { requireCurrentUser } from '../../middleware/auth.middleware.js';

// ============================================
// GET /api/v1/tags - List Tags
// ============================================

export const GET = async (req: Request, res: Response): Promise<void> => {
  // Parse query parameters
  const queryParams = tagQuerySchema.parse(req.query);

  // List tags
  const result = await tagService.listTags(queryParams);
  sendSuccess(res, result, 'Tags retrieved successfully');
};

// ============================================
// POST /api/v1/tags - Create Tag
// ============================================

export const POST = async (req: Request, res: Response): Promise<void> => {
  const user = requireCurrentUser(req);

  // Validate request body
  const validatedData = createTagSchema.parse(req.body);

  // Create tag - ensure description is undefined if null
  const tagData = {
    ...validatedData,
    description: validatedData.description ?? undefined,
  };

  // Create tag
  const result = await tagService.createTag(tagData);

  sendSuccess(res, result, 'Tag created successfully');
};

