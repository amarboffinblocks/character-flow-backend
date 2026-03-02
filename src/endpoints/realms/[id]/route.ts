import type { Request, Response } from 'express';
import { realmService, updateRealmSchema } from '../../../modules/realm/index.js';
import { sendSuccess } from '../../../utils/response.js';
import { requireCurrentUser } from '../../../middleware/auth.middleware.js';
import { realmImageUpload } from '../../../middleware/upload.middleware.js';
import { processImageUpload } from '../../../utils/image.helper.js';

// ============================================
// GET /api/v1/realms/:id - Get Realm By ID
// ============================================

export const GET = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    if (!id) throw new Error('Realm ID is required');

    const user = requireCurrentUser(req);
    const result = await realmService.getRealmById(id, user.id);
    sendSuccess(res, result, 'Realm retrieved successfully');
};

// ============================================
// PATCH /api/v1/realms/:id - Update Realm
// ============================================

export const PATCH = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    if (!id) throw new Error('Realm ID is required');

    const user = requireCurrentUser(req);
    const isMultipart = req.headers['content-type']?.includes('multipart/form-data');

    if (isMultipart) {
        return new Promise<void>((resolve, reject) => {
            realmImageUpload(req, res, async (err) => {
                if (err) {
                    res.status(400).json({
                        success: false,
                        error: {
                            code: 'VALIDATION_ERROR',
                            message: err.message,
                        },
                    });
                    return resolve();
                }

                try {
                    await processRealmUpdate(req, res, id, user.id);
                    resolve();
                } catch (error) {
                    if (error instanceof Error) {
                        res.status(400).json({
                            success: false,
                            error: {
                                code: 'VALIDATION_ERROR',
                                message: error.message,
                            },
                        });
                        return resolve();
                    }
                    reject(error);
                }
            });
        });
    }

    try {
        await processRealmUpdate(req, res, id, user.id);
    } catch (error) {
        if (error instanceof Error) {
            res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: error.message,
                },
            });
            return;
        }
        throw error;
    }
};

async function processRealmUpdate(
    req: Request,
    res: Response,
    id: string,
    userId: string
): Promise<void> {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    let avatarMetadata = null;

    if (files?.avatar?.[0]) {
        avatarMetadata = await processImageUpload(files.avatar[0], 'realms');
    }

    let bodyData = req.body;

    // Parse string fields if from form-data
    if (typeof bodyData.tags === 'string' && bodyData.tags.trim()) {
        try {
            bodyData.tags = JSON.parse(bodyData.tags);
        } catch {
            bodyData.tags = bodyData.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
        }
    }

    if (bodyData.isFavourite !== undefined && typeof bodyData.isFavourite === 'string') {
        bodyData.isFavourite = bodyData.isFavourite === 'true';
    }

    const avatar = avatarMetadata || (bodyData.avatar ? (typeof bodyData.avatar === 'string' ? JSON.parse(bodyData.avatar) : bodyData.avatar) : undefined);

    const validatedData = updateRealmSchema.parse({
        ...bodyData,
        ...(avatar !== undefined && { avatar }),
    });

    const result = await realmService.updateRealm(id, userId, validatedData);
    sendSuccess(res, result, 'Realm updated successfully');
}

// ============================================
// DELETE /api/v1/realms/:id - Delete Realm
// ============================================

export const DELETE = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    if (!id) throw new Error('Realm ID is required');

    const user = requireCurrentUser(req);
    const result = await realmService.deleteRealm(id, user.id);
    sendSuccess(res, result, result.message);
};
