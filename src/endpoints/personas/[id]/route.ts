import type { Request, Response } from 'express';
import { personaService, updatePersonaSchema } from '../../../modules/persona/index.js';
import { sendSuccess } from '../../../utils/response.js';
import { requireCurrentUser } from '../../../middleware/auth.middleware.js';
import type { AuthenticatedRequest } from '../../../types/index.js';
import { personaImageUpload } from '../../../middleware/upload.middleware.js';
import { processImageUpload } from '../../../utils/image.helper.js';

// ============================================
// GET /api/v1/personas/:id - Get Persona By ID
// ============================================

export const GET = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  if (!id) {
    throw new Error('Persona ID is required');
  }
  const user = (req as AuthenticatedRequest).user;

  const result = await personaService.getPersonaById(id, user?.id);
  sendSuccess(res, result, 'Persona retrieved successfully');
};

// ============================================
// PUT /api/v1/personas/:id - Update Persona
// ============================================

export const PUT = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  if (!id) {
    throw new Error('Persona ID is required');
  }
  const user = requireCurrentUser(req);

  // Check if request is multipart/form-data
  const isMultipart = req.headers['content-type']?.includes('multipart/form-data');

  // Handle file uploads if multipart
  if (isMultipart) {
    return new Promise<void>((resolve, reject) => {
      personaImageUpload(req, res, async (err) => {
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
          await processPersonaUpdate(req, res, id, user.id);
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

  // Handle JSON request (backward compatibility)
  try {
    await processPersonaUpdate(req, res, id, user.id);
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
    throw error;
  }
};

async function processPersonaUpdate(
  req: Request,
  res: Response,
  personaId: string,
  userId: string
): Promise<void> {
  // Process uploaded images if any
  const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

  let avatarMetadata = null;
  let backgroundImgMetadata = null;

  if (files?.avatar?.[0]) {
    avatarMetadata = await processImageUpload(files.avatar[0], 'personas');
  }

  if (files?.backgroundImage?.[0]) {
    backgroundImgMetadata = await processImageUpload(files.backgroundImage[0], 'personas');
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

  // Handle avatar - prioritize uploaded file, then JSON data, then keep existing
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

  // Handle backgroundImage - prioritize uploaded file, then JSON data, then keep existing
  let backgroundImg = backgroundImgMetadata;
  if (!backgroundImg && bodyData.backgroundImage) {
    if (typeof bodyData.backgroundImage === 'string') {
      try {
        backgroundImg = JSON.parse(bodyData.backgroundImage);
      } catch {
        // If parsing fails, ignore
      }
    } else {
      backgroundImg = bodyData.backgroundImage;
    }
  }

  // Map frontend field names to API field names
  const mappedData: any = {
    ...bodyData,
  };

  if (bodyData.personaName || bodyData.name) {
    mappedData.name = bodyData.personaName || bodyData.name;
  }
  if (bodyData.details || bodyData.description) {
    mappedData.description = bodyData.details || bodyData.description;
  }
  if (bodyData.visiable || bodyData.visibility) {
    mappedData.visibility = bodyData.visiable || bodyData.visibility;
  }
  if (avatar !== null) {
    mappedData.avatar = avatar;
  }
  if (backgroundImg !== null) {
    mappedData.backgroundImg = backgroundImg;
  }
  // Handle lorebookId - map from 'lorebook' field or use 'lorebookId' directly
  if (bodyData.lorebook !== undefined || bodyData.lorebookId !== undefined) {
    mappedData.lorebookId = bodyData.lorebook || bodyData.lorebookId || null;
  }

  // Remove frontend-specific fields
  delete mappedData.personaName;
  delete mappedData.details;
  delete mappedData.visiable;
  delete mappedData.backgroundImage;
  delete mappedData.lorebook; // Remove frontend field name

  // Handle favourite separately (if provided as string 'true'/'false')
  if (mappedData.favourite !== undefined) {
    mappedData.isFavourite = mappedData.favourite === 'true' || mappedData.favourite === true;
    delete mappedData.favourite;
  }

  // Validate request body
  const validatedData = updatePersonaSchema.parse(mappedData);

  // Update persona
  const result = await personaService.updatePersona(personaId, userId, validatedData);

  sendSuccess(res, result, 'Persona updated successfully');
}

// ============================================
// DELETE /api/v1/personas/:id - Delete Persona
// ============================================

export const DELETE = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  if (!id) {
    throw new Error('Persona ID is required');
  }
  const user = requireCurrentUser(req);

  // Delete persona
  const result = await personaService.deletePersona(id, user.id);

  sendSuccess(res, result, result.message);
};
