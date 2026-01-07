import type { Request, Response } from 'express';
import { characterService, batchDuplicateCharacterSchema } from '../../../modules/character/index.js';
import { sendSuccess } from '../../../utils/response.js';
import { requireCurrentUser } from '../../../middleware/auth.middleware.js';

// ============================================
// POST /api/v1/characters/batch-duplicate - Batch Duplicate Characters
// ============================================

export const POST = async (req: Request, res: Response): Promise<void> => {
  const user = requireCurrentUser(req);

  // Validate request body
  const validatedData = batchDuplicateCharacterSchema.parse(req.body);

  // Batch duplicate characters
  const result = await characterService.batchDuplicateCharacters(
    validatedData.characterIds,
    user.id
  );

  sendSuccess(
    res,
    {
      characters: result.characters,
      message: `Successfully duplicated ${result.characters.length} character(s)`,
    },
    `Successfully duplicated ${result.characters.length} character(s)`
  );
};

