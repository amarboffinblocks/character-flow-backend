import type { Request, Response } from 'express';
import { lorebookService } from '../../../modules/lorebook/index.js';
import { sendSuccess } from '../../../utils/response.js';
import { requireCurrentUser } from '../../../middleware/auth.middleware.js';
import multer from 'multer';
import { createError } from '../../../utils/errors.js';

// ============================================
// Multer Configuration for Import
// ============================================

const storage = multer.memoryStorage();

const fileFilter = (
  req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
): void => {
  if (file.mimetype === 'application/json') {
    cb(null, true);
  } else {
    cb(
      createError.badRequest('Invalid file type. Only JSON files are allowed') as unknown as Error
    );
  }
};

export const lorebookImportUpload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
    files: 1,
  },
  fileFilter,
}).single('file');

// ============================================
// POST /api/v1/lorebooks/import - Import Lorebook
// ============================================

export const POST = async (req: Request, res: Response): Promise<void> => {
  const user = requireCurrentUser(req);

  return new Promise<void>((resolve, reject) => {
    lorebookImportUpload(req, res, async (err) => {
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

        const jsonString = file.buffer.toString('utf-8');
        let lorebookData: any;

        try {
          lorebookData = JSON.parse(jsonString);
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

        const result = await lorebookService.importLorebook(user.id, lorebookData);

        sendSuccess(res, result, 'Lorebook imported successfully', 201);
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
