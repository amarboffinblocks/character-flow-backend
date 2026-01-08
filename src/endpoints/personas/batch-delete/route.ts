import type { Request, Response } from 'express';
import { personaService, batchDeletePersonaSchema } from '../../../modules/persona/index.js';
import { sendSuccess } from '../../../utils/response.js';
import { requireCurrentUser } from '../../../middleware/auth.middleware.js';

// ============================================
// POST /api/v1/personas/batch-delete - Batch Delete Personas
// ============================================

export const POST = async (req: Request, res: Response): Promise<void> => {
  const user = requireCurrentUser(req);

  // Validate request body
  const validatedData = batchDeletePersonaSchema.parse(req.body);

  // Batch delete personas
  const result = await personaService.batchDeletePersonas(
    validatedData.personaIds,
    user.id
  );

  sendSuccess(
    res,
    {
      deleted: result.deleted,
      failed: result.failed,
      message: `Successfully deleted ${result.deleted} persona(s)${result.failed > 0 ? `, ${result.failed} failed` : ''}`,
    },
    `Successfully deleted ${result.deleted} persona(s)${result.failed > 0 ? `, ${result.failed} failed` : ''}`
  );
};
