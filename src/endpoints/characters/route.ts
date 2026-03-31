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

    // visibility=public should always return global public catalog for everyone.
    if (queryParams.visibility === 'public') {
        const result = await characterService.getPublicCharacters(queryParams, user?.id);
        sendSuccess(res, result, 'Public characters retrieved successfully');
        return;
    }

    // visibility=private should remain private (creator-only list).
    if (queryParams.visibility === 'private') {
        if (!user) {
            const result = { characters: [], pagination: { page: queryParams.page ?? 1, limit: queryParams.limit ?? 20, total: 0, totalPages: 0 } };
            sendSuccess(res, result, 'Private characters are only visible to their creators');
            return;
        }
        const result = await characterService.getUserCharacters(user.id, queryParams);
        sendSuccess(res, result, 'Characters retrieved successfully');
        return;
    }

    if (user) {
        // "All" for authenticated users:
        // - own private + own public + other users' public
        const result = await characterService.getAccessibleCharacters(user.id, queryParams);
        sendSuccess(res, result, 'Characters retrieved successfully');
        return;
    }

    // Unauthenticated users only get public characters.
    const result = await characterService.getPublicCharacters(queryParams, undefined);
    sendSuccess(res, result, 'Public characters retrieved successfully');
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
                    const fallbackMessage =
                        typeof error === 'object' && error !== null && 'message' in error
                            ? String((error as { message?: unknown }).message)
                            : JSON.stringify(error);
                    reject(new Error(fallbackMessage || 'Character creation failed'));
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
        const fallbackMessage =
            typeof error === 'object' && error !== null && 'message' in error
                ? String((error as { message?: unknown }).message)
                : JSON.stringify(error);
        throw new Error(fallbackMessage || 'Character creation failed');
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

    if (files?.avatar?.[0]) {
        avatarMetadata = await processImageUpload(files.avatar[0], 'characters');
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

    // Map frontend field names to API field names
    const mappedData = {
        ...bodyData,
        name: bodyData.characterName || bodyData.name,
        visibility: bodyData.visiable || bodyData.visibility,
        summary: bodyData.personality || bodyData.summary,
        avatar,
        exampleDialogues: bodyData.exampleDialogue
            ? (Array.isArray(bodyData.exampleDialogue)
                ? bodyData.exampleDialogue
                : [bodyData.exampleDialogue])
            : bodyData.exampleDialogues,
        // Handle personaId - map from 'persona' field or use 'personaId' directly
        personaId: bodyData.persona || bodyData.personaId || undefined,
        // Handle lorebookId - map from 'lorebook' field or use 'lorebookId' directly
        lorebookId: bodyData.lorebook || bodyData.lorebookId || undefined,
    };

    // Remove frontend-specific fields
    delete mappedData.characterName;
    delete mappedData.visiable;
    delete mappedData.personality;
    delete mappedData.exampleDialogue;
    delete mappedData.persona; // Remove frontend field name (use personaId)
    delete mappedData.lorebook; // Remove frontend field name (use lorebookId)
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
        firstMessage: validatedData.firstMessage ?? undefined,
        authorNotes: validatedData.authorNotes ?? undefined,
        characterNotes: validatedData.characterNotes ?? undefined,
        authorName: validatedData.authorName ?? undefined,
        personaId: validatedData.personaId ?? undefined,
        lorebookId: validatedData.lorebookId ?? undefined,
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
