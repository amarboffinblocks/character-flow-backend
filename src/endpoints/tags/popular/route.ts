import type { Request, Response } from 'express';
import { tagService } from '../../../modules/tag/index.js';
import { sendSuccess } from '../../../utils/response.js';
import { z } from 'zod';

// ============================================
// GET /api/v1/tags/popular - Get Popular Tags
// ============================================

const popularTagsQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 10))
    .pipe(z.number().int().min(1).max(100)),
  category: z.enum(['SFW', 'NSFW']).optional(),
});

export const GET = async (req: Request, res: Response): Promise<void> => {
  const queryParams = popularTagsQuerySchema.parse(req.query);

  // Get popular tags
  const result = await tagService.getPopularTags(queryParams.limit, queryParams.category);

  sendSuccess(res, result, 'Popular tags retrieved successfully');
};

