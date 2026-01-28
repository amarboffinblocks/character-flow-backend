import type { Request, Response } from 'express';
import { personaService } from '../../../../modules/persona/index.js';
import { sendSuccess } from '../../../../utils/response.js';
import { requireCurrentUser } from '../../../../middleware/auth.middleware.js';

// ============================================
// POST /api/v1/personas/:id/duplicate - Duplicate Persona
// ============================================

export const POST = async (req: Request, res: Response): Promise<void> => {
    const user = requireCurrentUser(req);
    const { id } = req.params;

    if (!id) {
        res.status(400).json({
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: 'Persona ID is required',
            },
        });
        return;
    }

    const result = await personaService.duplicatePersona(id, user.id);

    sendSuccess(res, result, 'Persona duplicated successfully', 201);
};
