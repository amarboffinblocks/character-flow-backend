import type { Request, Response } from 'express';
import { authService, updateProfileSchema } from '../../../modules/auth/index.js';
import { sendSuccess } from '../../../utils/response.js';
import { requireCurrentUser } from '../../../middleware/auth.middleware.js';
import { personaImageUpload } from '../../../middleware/upload.middleware.js';
import { processImageUpload } from '../../../utils/image.helper.js';

// ============================================
// PUT /api/v1/user/profile
// ============================================

export const PUT = async (req: Request, res: Response): Promise<void> => {
  const currentUser = requireCurrentUser(req);

  const isMultipart = req.headers['content-type']?.includes('multipart/form-data');

  if (isMultipart) {
    return new Promise<void>((resolve, reject) => {
      personaImageUpload(req, res, async (err) => {
        if (err) {
          res.status(400).json({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: err.message },
          });
          return resolve();
        }
        try {
          await processProfileUpdate(req, res, currentUser.id);
          resolve();
        } catch (error) {
          if (error instanceof Error) {
            res.status(400).json({
              success: false,
              error: { code: 'VALIDATION_ERROR', message: error.message },
            });
            return resolve();
          }
          reject(error);
        }
      });
    });
  }

  try {
    const validatedData = updateProfileSchema.parse(req.body);
    const user = await authService.updateProfile(currentUser.id, validatedData);
    sendSuccess(res, { user }, 'Profile updated successfully');
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: error.message },
      });
      return;
    }
    throw error;
  }
};

async function processProfileUpdate(req: Request, res: Response, userId: string): Promise<void> {
  const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

  let avatarMetadata = null;
  let backgroundImgMetadata = null;

  if (files?.avatar?.[0]) {
    avatarMetadata = await processImageUpload(files.avatar[0], 'users');
  }
  if (files?.['backgroundImage']?.[0]) {
    backgroundImgMetadata = await processImageUpload(files['backgroundImage'][0], 'users');
  }

  let bodyData = req.body;

  if (typeof bodyData.tagsToFollow === 'string') {
    try {
      bodyData.tagsToFollow = JSON.parse(bodyData.tagsToFollow);
    } catch {
      bodyData.tagsToFollow = bodyData.tagsToFollow ? [bodyData.tagsToFollow] : [];
    }
  }
  if (typeof bodyData.tagsToAvoid === 'string') {
    try {
      bodyData.tagsToAvoid = JSON.parse(bodyData.tagsToAvoid);
    } catch {
      bodyData.tagsToAvoid = bodyData.tagsToAvoid ? [bodyData.tagsToAvoid] : [];
    }
  }

  let avatar = avatarMetadata;
  if (!avatar && bodyData.avatar) {
    try {
      avatar = typeof bodyData.avatar === 'string' ? JSON.parse(bodyData.avatar) : bodyData.avatar;
    } catch {
      avatar = bodyData.avatar;
    }
  }

  let backgroundImg = backgroundImgMetadata;
  if (!backgroundImg && bodyData.backgroundImage) {
    try {
      backgroundImg = typeof bodyData.backgroundImage === 'string' ? JSON.parse(bodyData.backgroundImage) : bodyData.backgroundImage;
    } catch {
      backgroundImg = bodyData.backgroundImage;
    }
  }

  const mappedData = { ...bodyData };
  if (avatar !== null) mappedData.avatar = avatar;
  if (backgroundImg !== null) mappedData.backgroundImg = backgroundImg;
  delete mappedData.backgroundImage;

  const validatedData = updateProfileSchema.parse(mappedData);
  const user = await authService.updateProfile(userId, validatedData);
  sendSuccess(res, { user }, 'Profile updated successfully');
}

