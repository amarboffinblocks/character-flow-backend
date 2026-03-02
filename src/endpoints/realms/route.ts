import type { Request, Response } from 'express';
import { realmService, realmQuerySchema, createRealmSchema } from '../../modules/realm/index.js';
import { sendSuccess } from '../../utils/response.js';
import { requireCurrentUser } from '../../middleware/auth.middleware.js';
import type { AuthenticatedRequest } from '../../types/index.js';
import { realmImageUpload } from '../../middleware/upload.middleware.js';
import { processImageUpload } from '../../utils/image.helper.js';

// ============================================
// GET /api/v1/realms - List Realms
// ============================================

export const GET = async (req: Request, res: Response): Promise<void> => {
    const queryParams = realmQuerySchema.parse(req.query);
    const user = (req as AuthenticatedRequest).user;

    if (!user) {
        // For now, only authenticated users can list realms, 
        // or we could add a public listing if needed.
        const result = { realms: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } };
        sendSuccess(res, result, 'No realms found (require authentication)');
        return;
    }

    const result = await realmService.getUserRealms(user.id, {
        page: queryParams.page,
        limit: queryParams.limit,
        search: queryParams.search,
        rating: queryParams.rating,
        visibility: queryParams.visibility,
        tags: queryParams.tags,
        isFavourite: queryParams.isFavourite,
        sortBy: queryParams.sortBy,
        sortOrder: queryParams.sortOrder,
    });

    sendSuccess(res, result, 'Realms retrieved successfully');
};

// ============================================
// POST /api/v1/realms - Create Realm
// ============================================

export const POST = async (req: Request, res: Response): Promise<void> => {
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
                    await processRealmCreation(req, res, user.id);
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
        await processRealmCreation(req, res, user.id);
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

async function processRealmCreation(
    req: Request,
    res: Response,
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

    if (typeof bodyData.characterIds === 'string' && bodyData.characterIds.trim()) {
        try {
            bodyData.characterIds = JSON.parse(bodyData.characterIds);
        } catch {
            bodyData.characterIds = bodyData.characterIds.split(',').map((t: string) => t.trim()).filter(Boolean);
        }
    }

    const avatar = avatarMetadata || (bodyData.avatar ? (typeof bodyData.avatar === 'string' ? JSON.parse(bodyData.avatar) : bodyData.avatar) : null);

    const validatedData = createRealmSchema.parse({
        ...bodyData,
        avatar,
    });

    const result = await realmService.createRealm(userId, validatedData);

    sendSuccess(res, result, 'Realm created successfully', 201);
}
