import type { Request, Response } from 'express';
import { characterService, batchDeleteCharacterSchema } from '../../../modules/character/index.js';
import { sendSuccess } from '../../../utils/response.js';
import { requireCurrentUser } from '../../../middleware/auth.middleware.js';

// ============================================
// POST /api/v1/characters/batch-delete - Batch Delete Characters
// ============================================

export const POST = async (req: Request, res: Response): Promise<void> => {
  const user = requireCurrentUser(req);

  // Validate request body
  const validatedData = batchDeleteCharacterSchema.parse(req.body);

  // Batch delete characters
  const result = await characterService.batchDeleteCharacters(
    validatedData.characterIds,
    user.id
  );

  sendSuccess(
    res,
    {
      success: result.success,
      failed: result.failed,
      errors: result.errors,
      message: `Successfully deleted ${result.success} character(s)${result.failed > 0 ? `, ${result.failed} failed` : ''}`,
    },
    `Successfully deleted ${result.success} character(s)${result.failed > 0 ? `, ${result.failed} failed` : ''}`
  );
};

