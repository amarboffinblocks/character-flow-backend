import type { Request, Response } from 'express';
import { lorebookService, batchDeleteLorebookSchema } from '../../../modules/lorebook/index.js';
import { sendSuccess } from '../../../utils/response.js';
import { requireCurrentUser } from '../../../middleware/auth.middleware.js';

// ============================================
// POST /api/v1/lorebooks/batch-delete - Batch Delete Lorebooks
// ============================================

export const POST = async (req: Request, res: Response): Promise<void> => {
  const user = requireCurrentUser(req);

  // Validate request body
  const validatedData = batchDeleteLorebookSchema.parse(req.body);

  // Batch delete lorebooks
  const result = await lorebookService.batchDeleteLorebooks(
    validatedData.lorebookIds,
    user.id
  );

  sendSuccess(
    res,
    {
      success: result.success,
      failed: result.failed,
      errors: result.errors,
      message: `Successfully deleted ${result.success} lorebook(s)${result.failed > 0 ? `, ${result.failed} failed` : ''}`,
    },
    `Successfully deleted ${result.success} lorebook(s)${result.failed > 0 ? `, ${result.failed} failed` : ''}`
  );
};
