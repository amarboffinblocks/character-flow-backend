import type { Request, Response } from 'express';
import { backgroundService } from '../../../../modules/background/index.js';
import { sendSuccess } from '../../../../utils/response.js';
import { requireCurrentUser } from '../../../../middleware/auth.middleware.js';
import multer from 'multer';
import { createError } from '../../../../utils/errors.js';
import { UPLOAD_CONSTANTS } from '../../../../core/constants/index.js';
import { processImageUpload } from '../../../../utils/image.helper.js';

// ============================================
// Multer Configuration for Bulk Import
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

const backgroundBulkImportUpload = multer({
  storage,
  limits: {
    fileSize: UPLOAD_CONSTANTS.MAX_SIZE,
    files: 20,
  },
  fileFilter,
}).array('files', 20);

// ============================================
// POST /api/v1/backgrounds/import/bulk - Bulk Import Backgrounds
// ============================================

export const POST = async (req: Request, res: Response): Promise<void> => {
  const user = requireCurrentUser(req);

  return new Promise<void>((resolve, reject) => {
    backgroundBulkImportUpload(req, res, async (err) => {
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
        const files = req.files as Express.Multer.File[] | undefined;
        if (!files || files.length === 0) {
          res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'At least one image file is required',
            },
          });
          return resolve();
        }

        const imageMetadataList: Array<{ url: string; width?: number; height?: number }> = [];

        for (const file of files) {
          const metadata = await processImageUpload(file, 'backgrounds');
          if (metadata) {
            imageMetadataList.push(metadata);
          }
        }

        if (imageMetadataList.length === 0) {
          res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'No valid images could be processed',
            },
          });
          return resolve();
        }

        const result = await backgroundService.bulkImportBackgrounds(user.id, imageMetadataList);

        sendSuccess(
          res,
          {
            imported: result.imported,
            failed: result.failed,
            backgrounds: result.backgrounds,
            errors: result.errors,
          },
          `Successfully imported ${result.imported} background(s)`,
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
