import type { Request, Response } from 'express';
import { backgroundService } from '../../../modules/background/index.js';
import { sendSuccess } from '../../../utils/response.js';
import { requireCurrentUser } from '../../../middleware/auth.middleware.js';
import multer from 'multer';
import { createError } from '../../../utils/errors.js';
import { UPLOAD_CONSTANTS } from '../../../core/constants/index.js';
import { processImageUpload } from '../../../utils/image.helper.js';

// ============================================
// Multer Configuration for Import
// ============================================

const storage = multer.memoryStorage();

const fileFilter = (
  req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
): void => {
  if (file.mimetype && UPLOAD_CONSTANTS.ALLOWED_TYPES.includes(file.mimetype as typeof UPLOAD_CONSTANTS.ALLOWED_TYPES[number])) {
    cb(null, true);
  } else {
    cb(
      createError.badRequest(
        `Invalid file type. Allowed types: ${UPLOAD_CONSTANTS.ALLOWED_TYPES.join(', ')}`
      ) as unknown as Error
    );
  }
};

const backgroundImportUpload = multer({
  storage,
  limits: {
    fileSize: UPLOAD_CONSTANTS.MAX_SIZE,
    files: 1,
  },
  fileFilter,
}).single('file');

// ============================================
// POST /api/v1/backgrounds/import - Import Single Background
// ============================================

export const POST = async (req: Request, res: Response): Promise<void> => {
  const user = requireCurrentUser(req);

  return new Promise<void>((resolve, reject) => {
    backgroundImportUpload(req, res, async (err) => {
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
              message: 'Image file is required',
            },
          });
          return resolve();
        }

        const imageMetadata = await processImageUpload(file, 'backgrounds');
        if (!imageMetadata) {
          res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Failed to process image',
            },
          });
          return resolve();
        }

        const result = await backgroundService.importBackground(user.id, imageMetadata);
        sendSuccess(res, result, 'Background imported successfully', 201);
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
