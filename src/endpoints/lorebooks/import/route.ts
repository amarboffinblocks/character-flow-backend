import type { Request, Response } from 'express';
import { lorebookService } from '../../../modules/lorebook/index.js';
import { sendSuccess, sendError } from '../../../utils/response.js';
import { requireCurrentUser } from '../../../middleware/auth.middleware.js';
import multer from 'multer';
import { createError, formatZodErrorForResponse } from '../../../utils/errors.js';
import { config } from '../../../config/index.js';

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
    fileSize: config.upload.importMaxSize,
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
        const isLimitError = (err as { code?: string }).code === 'LIMIT_FILE_SIZE';
        const message = isLimitError
          ? `File is too large. Maximum size for import is ${Math.round(config.upload.importMaxSize / 1024 / 1024)}MB.`
          : err.message;
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message,
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
        const issues = (error as { issues?: unknown[] }).issues;
        if (Array.isArray(issues) && issues.length > 0) {
          const { message, details } = formatZodErrorForResponse(error);
          sendError(res, message, 'VALIDATION_ERROR', 422, details);
          return resolve();
        }
        if (error instanceof Error) {
          sendError(res, error.message, 'VALIDATION_ERROR', 400);
          return resolve();
        }
        reject(error);
      }
    });
  });
};
