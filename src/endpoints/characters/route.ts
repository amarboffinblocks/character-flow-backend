import type { Request, Response } from 'express';
import { characterService, characterQuerySchema, createCharacterSchema } from '../../modules/character/index.js';
import { sendSuccess } from '../../utils/response.js';
import { requireCurrentUser } from '../../middleware/auth.middleware.js';
import type { AuthenticatedRequest } from '../../types/index.js';
import { characterImageUpload } from '../../middleware/upload.middleware.js';
import { processImageUpload } from '../../utils/image.helper.js';

// ============================================
// GET /api/v1/characters - List Characters
// ============================================

export const GET = async (req: Request, res: Response): Promise<void> => {
    // Parse query parameters
    const queryParams = characterQuerySchema.parse(req.query);

    // Get current user if authenticated
    const user = (req as AuthenticatedRequest).user;

    if (user) {
        // If authenticated, get user's characters (both public and private)
        const result = await characterService.getUserCharacters(user.id, queryParams);
        sendSuccess(res, result, 'Characters retrieved successfully');
    } else {
        // If not authenticated, get only public characters
        const result = await characterService.getPublicCharacters(queryParams);
        sendSuccess(res, result, 'Public characters retrieved successfully');
    }
};

// ============================================
// POST /api/v1/characters - Create Character
// ============================================

export const POST = async (req: Request, res: Response): Promise<void> => {
    const user = requireCurrentUser(req);

    // Check if request is multipart/form-data
    const isMultipart = req.headers['content-type']?.includes('multipart/form-data');

    // Handle file uploads if multipart
    if (isMultipart) {
        return new Promise<void>((resolve, reject) => {
            characterImageUpload(req, res, async (err) => {
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
                    await processCharacterCreation(req, res, user.id);
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

    // Handle JSON request (backward compatibility)
    try {
        await processCharacterCreation(req, res, user.id);
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

async function processCharacterCreation(
    req: Request,
    res: Response,
    userId: string
): Promise<void> {
    // Process uploaded images if any
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

    let avatarMetadata = null;
    let backgroundImgMetadata = null;

    if (files?.avatar?.[0]) {
        avatarMetadata = await processImageUpload(files.avatar[0], 'characters');
    }

    if (files?.['backgroundImage']?.[0]) {
        backgroundImgMetadata = await processImageUpload(files['backgroundImage'][0], 'characters');
    }

    // Parse form data - handle both JSON and form-data
    let bodyData = req.body;

    // If form-data, parse string fields (arrays and objects come as strings)
    if (typeof bodyData.tags === 'string') {
        try {
            // Try to parse as JSON array first
            bodyData.tags = JSON.parse(bodyData.tags);
        } catch {
            // If not JSON, split comma-separated string into array
            if (bodyData.tags.includes(',')) {
                bodyData.tags = bodyData.tags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag.length > 0);
            } else {
                // Single tag value
                bodyData.tags = bodyData.tags.trim() ? [bodyData.tags.trim()] : [];
            }
        }
    }

    if (typeof bodyData.alternateMessages === 'string') {
        try {
            bodyData.alternateMessages = JSON.parse(bodyData.alternateMessages);
        } catch {
            bodyData.alternateMessages = bodyData.alternateMessages ? [bodyData.alternateMessages] : [];
        }
    }

    // Handle avatar - prioritize uploaded file, then JSON data
    let avatar = avatarMetadata;
    if (!avatar && bodyData.avatar) {
        if (typeof bodyData.avatar === 'string') {
            try {
                avatar = JSON.parse(bodyData.avatar);
            } catch {
                // If parsing fails, ignore
            }
        } else {
            avatar = bodyData.avatar;
        }
    }

    // Handle backgroundImg - prioritize uploaded file, then JSON data
    let backgroundImg = backgroundImgMetadata;
    if (!backgroundImg && bodyData.backgroundImage) {
        if (typeof bodyData.backgroundImage === 'string') {
            try {
                backgroundImg = JSON.parse(bodyData.backgroundImage);
            } catch {
                // If parsing fails, ignore
            }
        } else {
            backgroundImg = bodyData.backgroundImage;
        }
    }

    // Map frontend field names to API field names
    const mappedData = {
        ...bodyData,
        name: bodyData.characterName || bodyData.name,
        visibility: bodyData.visiable || bodyData.visibility,
        summary: bodyData.personality || bodyData.summary,
        avatar,
        backgroundImg,
        exampleDialogues: bodyData.exampleDialogue
            ? (Array.isArray(bodyData.exampleDialogue)
                ? bodyData.exampleDialogue
                : [bodyData.exampleDialogue])
            : bodyData.exampleDialogues,
    };

    // Remove frontend-specific fields
    delete mappedData.characterName;
    delete mappedData.visiable;
    delete mappedData.personality;
    delete mappedData.exampleDialogue;
    delete mappedData.backgroundImage;
    const shouldFavourite = mappedData.favourite === 'true' || mappedData.favourite === true;
    delete mappedData.favourite; // Handle separately after creation

    // Validate request body
    const validatedData = createCharacterSchema.parse(mappedData);

    // Convert null to undefined for optional fields to match CreateCharacterInput type
    const input = {
        ...validatedData,
        description: validatedData.description ?? undefined,
        scenario: validatedData.scenario ?? undefined,
        summary: validatedData.summary ?? undefined,
        avatar: validatedData.avatar ?? undefined,
        backgroundImg: validatedData.backgroundImg ?? undefined,
        firstMessage: validatedData.firstMessage ?? undefined,
        authorNotes: validatedData.authorNotes ?? undefined,
        characterNotes: validatedData.characterNotes ?? undefined,
        authorName: validatedData.authorName ?? undefined,
    };

    // Create character
    const result = await characterService.createCharacter(userId, input);

    // Handle favourite toggle if needed
    if (shouldFavourite && result.character.id) {
        try {
            await characterService.toggleFavourite(result.character.id, userId);
            // Refresh character to get updated favourite status
            const updatedCharacter = await characterService.getCharacterById(result.character.id, userId);
            result.character = updatedCharacter.character;
        } catch (error) {
            // Don't fail the entire operation if favourite toggle fails
            console.warn('Failed to set favourite status:', error);
        }
    }

    sendSuccess(res, result, 'Character created successfully', 201);
}
