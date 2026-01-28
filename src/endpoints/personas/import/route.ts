import type { Request, Response } from 'express';
import { personaService } from '../../../modules/persona/index.js';
import { sendSuccess } from '../../../utils/response.js';
import { requireCurrentUser } from '../../../middleware/auth.middleware.js';
import multer from 'multer';
import { createError } from '../../../utils/errors.js';
import { extractPngMetadata } from '../../../utils/png-metadata.js';

// ============================================
// Multer Configuration for Import
// ============================================

const storage = multer.memoryStorage();

// Allow JSON files for persona import
const fileFilter = (
    req: Express.Request,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback
): void => {
    const allowedMimeTypes = [
        'application/json',
        'image/png',
        'image/jpeg',
        'image/jpg',
    ];

    if (file.mimetype && allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(
            createError.badRequest(
                `Invalid file type. Allowed types: JSON, PNG, JPEG, JPG`
            ) as unknown as Error
        );
    }
};

export const personaImportUpload = multer({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max
        files: 1,
    },
    fileFilter,
}).single('file');

// ============================================
// POST /api/v1/personas/import - Import Persona
// ============================================

export const POST = async (req: Request, res: Response): Promise<void> => {
    const user = requireCurrentUser(req);

    return new Promise<void>((resolve, reject) => {
        personaImportUpload(req, res, async (err) => {
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
                const file = req.file;
                if (!file) {
                    res.status(400).json({
                        success: false,
                        error: {
                            code: 'VALIDATION_ERROR',
                            message: 'File is required',
                        },
                    });
                    return resolve();
                }

                // Parse file based on type
                let personaData: any;

                if (file.mimetype === 'application/json') {
                    // Parse JSON file
                    try {
                        const jsonString = file.buffer.toString('utf-8');
                        personaData = JSON.parse(jsonString);
                    } catch (parseError) {
                        res.status(400).json({
                            success: false,
                            error: {
                                code: 'VALIDATION_ERROR',
                                message: 'Invalid JSON file format',
                            },
                        });
                        return resolve();
                    }
                } else if (file.mimetype.startsWith('image/')) {
                    // Extract metadata from PNG if possible
                    if (file.mimetype === 'image/png') {
                        try {
                            const metadataString = extractPngMetadata(file.buffer, 'chara');
                            if (metadataString) {
                                personaData = JSON.parse(metadataString);
                                // If the embedded metadata is a SillyTavern character, it might be nested
                                if (personaData.data) {
                                    personaData = personaData.data;
                                }
                            } else {
                                throw new Error('No metadata found in PNG file');
                            }
                        } catch (parseError: any) {
                            res.status(400).json({
                                success: false,
                                error: {
                                    code: 'VALIDATION_ERROR',
                                    message: parseError.message || 'Failed to extract metadata from PNG',
                                },
                            });
                            return resolve();
                        }
                    } else {
                        res.status(400).json({
                            success: false,
                            error: {
                                code: 'VALIDATION_ERROR',
                                message: 'Metadata extraction is only supported for PNG files. Please use JSON for other image types.',
                            },
                        });
                        return resolve();
                    }
                } else {
                    res.status(400).json({
                        success: false,
                        error: {
                            code: 'VALIDATION_ERROR',
                            message: 'Unsupported file type',
                        },
                    });
                    return resolve();
                }

                // Import persona using the service
                const result = await personaService.importPersona(
                    user.id,
                    personaData,
                    file.mimetype.startsWith('image/') ? file : undefined
                );

                sendSuccess(res, result, 'Persona imported successfully', 201);
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
};

// ============================================
// POST /api/v1/personas/import/bulk - Bulk Import Personas
// ============================================

export const bulkImport = async (req: Request, res: Response): Promise<void> => {
    const user = requireCurrentUser(req);

    return new Promise<void>((resolve, reject) => {
        personaImportUpload(req, res, async (err) => {
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
                const file = req.file;
                if (!file) {
                    res.status(400).json({
                        success: false,
                        error: {
                            code: 'VALIDATION_ERROR',
                            message: 'File is required',
                        },
                    });
                    return resolve();
                }

                if (file.mimetype !== 'application/json') {
                    res.status(400).json({
                        success: false,
                        error: {
                            code: 'VALIDATION_ERROR',
                            message: 'Bulk import requires a JSON file',
                        },
                    });
                    return resolve();
                }

                let personasData: any[];
                try {
                    const jsonString = file.buffer.toString('utf-8');
                    personasData = JSON.parse(jsonString);
                    if (!Array.isArray(personasData)) {
                        throw new Error('JSON must be an array of personas');
                    }
                } catch (parseError: any) {
                    res.status(400).json({
                        success: false,
                        error: {
                            code: 'VALIDATION_ERROR',
                            message: parseError.message || 'Invalid JSON file format',
                        },
                    });
                    return resolve();
                }

                const result = await personaService.bulkImportPersonas(user.id, personasData);

                sendSuccess(res, result, 'Bulk personas import completed', 201);
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
};
