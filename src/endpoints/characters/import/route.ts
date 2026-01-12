import type { Request, Response } from 'express';
import { characterService } from '../../../modules/character/index.js';
import { sendSuccess } from '../../../utils/response.js';
import { requireCurrentUser } from '../../../middleware/auth.middleware.js';
import multer from 'multer';
import { createError } from '../../../utils/errors.js';

// ============================================
// Multer Configuration for Import
// ============================================

const storage = multer.memoryStorage();

// Allow JSON and PNG files for character import
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

export const characterImportUpload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
    files: 1,
  },
  fileFilter,
}).single('file');

// ============================================
// POST /api/v1/characters/import - Import Character
// ============================================

export const POST = async (req: Request, res: Response): Promise<void> => {
  const user = requireCurrentUser(req);

  return new Promise<void>((resolve, reject) => {
    characterImportUpload(req, res, async (err) => {
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
        let characterData: any;
        
        if (file.mimetype === 'application/json') {
          // Parse JSON file
          try {
            const jsonString = file.buffer.toString('utf-8');
            characterData = JSON.parse(jsonString);
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
          // For PNG/JPEG, we would need to extract metadata
          // For now, return an error indicating PNG import needs backend support
          res.status(400).json({
            success: false,
            error: {
              code: 'NOT_IMPLEMENTED',
              message: 'PNG import is not yet supported. Please use JSON format.',
            },
          });
          return resolve();
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

        // Import character using the service
        const result = await characterService.importCharacter(user.id, characterData);

        sendSuccess(res, result, 'Character imported successfully', 201);
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
