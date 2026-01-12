import type { Request, Response } from 'express';
import { characterService } from '../../../../modules/character/index.js';
import { sendSuccess } from '../../../../utils/response.js';
import { requireCurrentUser } from '../../../../middleware/auth.middleware.js';
import multer from 'multer';
import { createError } from '../../../../utils/errors.js';

// ============================================
// Multer Configuration for Bulk Import
// ============================================

const storage = multer.memoryStorage();

const fileFilter = (
  req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
): void => {
  const allowedMimeTypes = [
    'application/json',
    // ZIP support can be added later
    // 'application/zip',
    // 'application/x-zip-compressed',
  ];
  
  if (file.mimetype && allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      createError.badRequest(
        `Invalid file type. Allowed types: JSON`
      ) as unknown as Error
    );
  }
};

export const characterBulkImportUpload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max for ZIP files
    files: 1,
  },
  fileFilter,
}).single('file');

// ============================================
// POST /api/v1/characters/import/bulk - Bulk Import Characters
// ============================================

export const POST = async (req: Request, res: Response): Promise<void> => {
  const user = requireCurrentUser(req);

  return new Promise<void>((resolve, reject) => {
    characterBulkImportUpload(req, res, async (err) => {
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

        // For now, bulk import accepts a JSON array file
        // ZIP support can be added later with adm-zip
        let characters: any[] = [];
        const errors: Array<{ fileName: string; error: string }> = [];

        if (file.mimetype === 'application/json') {
          // Parse JSON array
          try {
            const jsonString = file.buffer.toString('utf-8');
            const parsed = JSON.parse(jsonString);
            
            if (Array.isArray(parsed)) {
              characters = parsed;
            } else {
              // Single character object - wrap in array
              characters = [parsed];
            }
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
        } else {
          res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Bulk import currently supports JSON files only. ZIP support coming soon.',
            },
          });
          return resolve();
        }

        if (characters.length === 0) {
          res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'No character data found in file',
            },
          });
          return resolve();
        }

        // Import all characters
        const result = await characterService.bulkImportCharacters(user.id, characters);

        sendSuccess(
          res,
          {
            imported: result.success,
            failed: result.failed + errors.length,
            characters: result.characters,
            errors: [...result.errors, ...errors],
          },
          `Successfully imported ${result.success} character(s)`,
          201
        );
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
