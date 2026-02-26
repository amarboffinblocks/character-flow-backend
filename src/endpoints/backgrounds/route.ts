import type { Request, Response } from 'express';
import {
  backgroundService,
  backgroundQuerySchema,
  createBackgroundSchema,
} from '../../modules/background/index.js';
import { sendSuccess } from '../../utils/response.js';
import { requireCurrentUser } from '../../middleware/auth.middleware.js';
import type { AuthenticatedRequest } from '../../types/index.js';
import { backgroundImageUpload } from '../../middleware/upload.middleware.js';
import { processImageUpload } from '../../utils/image.helper.js';

// ============================================
// GET /api/v1/backgrounds - List Backgrounds
// ============================================

export const GET = async (req: Request, res: Response): Promise<void> => {
  const user = requireCurrentUser(req);
  const queryParams = backgroundQuerySchema.parse(req.query);

  const result = await backgroundService.listBackgrounds(user.id, queryParams);
  sendSuccess(res, result, 'Backgrounds retrieved successfully');
};

// ============================================
// POST /api/v1/backgrounds - Upload Background
// ============================================

export const POST = async (req: Request, res: Response): Promise<void> => {
  const user = requireCurrentUser(req);

  const isMultipart = req.headers['content-type']?.includes('multipart/form-data');

  if (isMultipart) {
    return new Promise<void>((resolve, reject) => {
      backgroundImageUpload(req, res, async (err) => {
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
          await processBackgroundCreation(req, res, user.id);
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

  res.status(400).json({
    success: false,
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Multipart form-data with image file is required',
    },
  });
};

async function processBackgroundCreation(
  req: Request,
  res: Response,
  userId: string
): Promise<void> {
  const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
  const bodyData = req.body;

  const imageFile = files?.image?.[0];
  if (!imageFile) {
    throw new Error('Image file is required');
  }

  const imageMetadata = await processImageUpload(imageFile, 'backgrounds');
  if (!imageMetadata) {
    throw new Error('Failed to process image upload');
  }

  let tags: string[] = [];
  if (typeof bodyData.tags === 'string') {
    try {
      tags = JSON.parse(bodyData.tags);
    } catch {
      tags = bodyData.tags
        ? bodyData.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
        : [];
    }
  } else if (Array.isArray(bodyData.tags)) {
    tags = bodyData.tags;
  }

  const mappedData = {
    name: bodyData.name || null,
    description: bodyData.description || null,
    image: imageMetadata,
    tags,
    rating: bodyData.rating || 'SFW',
  };

  const validatedData = createBackgroundSchema.parse(mappedData);

  const result = await backgroundService.createBackground(userId, {
    ...validatedData,
    name: validatedData.name ?? undefined,
    description: validatedData.description ?? undefined,
  });

  sendSuccess(res, result, 'Background uploaded successfully', 201);
}
