import type { Request, Response } from 'express';
import { personaService } from '../../../modules/persona/index.js';
import { sendSuccess } from '../../../utils/response.js';
import { requireCurrentUser } from '../../../middleware/auth.middleware.js';
import { z } from 'zod';

const batchDuplicatePersonaSchema = z.object({
    personaIds: z
        .array(z.string().uuid('Invalid persona ID format'))
        .min(1, 'At least one persona ID is required')
        .max(100, 'Maximum 100 personas can be duplicated at once'),
});

// ============================================
// POST /api/v1/personas/batch-duplicate - Batch Duplicate Personas
// ============================================

export const POST = async (req: Request, res: Response): Promise<void> => {
    const user = requireCurrentUser(req);

    // Validate request body
    const validatedData = batchDuplicatePersonaSchema.parse(req.body);

    // Batch duplicate personas
    const result = await personaService.batchDuplicatePersonas(
        validatedData.personaIds,
        user.id
    );

    sendSuccess(
        res,
        {
            success: result.success,
            failed: result.failed,
            personas: result.personas,
            message: `Successfully duplicated ${result.success} persona(s)${result.failed > 0 ? `, ${result.failed} failed` : ''}`,
        },
        `Successfully duplicated ${result.success} persona(s)${result.failed > 0 ? `, ${result.failed} failed` : ''}`
    );
};
