import type { Request, Response } from 'express';
import { lorebookService, updateLorebookSchema } from '../../../modules/lorebook/index.js';
import { sendSuccess } from '../../../utils/response.js';
import { requireCurrentUser } from '../../../middleware/auth.middleware.js';
import type { AuthenticatedRequest } from '../../../types/index.js';
import { lorebookImageUpload } from '../../../middleware/upload.middleware.js';
import { processImageUpload } from '../../../utils/image.helper.js';

// ============================================
// GET /api/v1/lorebooks/:id - Get Lorebook By ID
// ============================================

export const GET = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  if (!id) {
    throw new Error('Lorebook ID is required');
  }
  const user = (req as AuthenticatedRequest).user;

  const result = await lorebookService.getLorebookById(id, user?.id);
  sendSuccess(res, result, 'Lorebook retrieved successfully');
};

// ============================================
// PUT /api/v1/lorebooks/:id - Update Lorebook
// ============================================

export const PUT = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  if (!id) {
    throw new Error('Lorebook ID is required');
  }
  const user = requireCurrentUser(req);

  // Check if request is multipart/form-data
  const isMultipart = req.headers['content-type']?.includes('multipart/form-data');

  // Handle file uploads if multipart
  if (isMultipart) {
    return new Promise<void>((resolve, reject) => {
      lorebookImageUpload(req, res, async (err) => {
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
          await processLorebookUpdate(req, res, id, user.id);
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
    await processLorebookUpdate(req, res, id, user.id);
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

async function processLorebookUpdate(
  req: Request,
  res: Response,
  lorebookId: string,
  userId: string
): Promise<void> {
  // Process uploaded images if any
  const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

  let avatarMetadata = null;

  if (files?.avatar?.[0]) {
    avatarMetadata = await processImageUpload(files.avatar[0], 'lorebooks');
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

  // Parse entries array from form-data (comes as stringified JSON)
  if (typeof bodyData.entries === 'string') {
    try {
      bodyData.entries = JSON.parse(bodyData.entries);
    } catch {
      // If parsing fails, set to empty array
      bodyData.entries = [];
    }
  }

  // Parse characterIds array from form-data (comes as stringified JSON or comma-separated)
  if (typeof bodyData.characterIds === 'string') {
    try {
      bodyData.characterIds = JSON.parse(bodyData.characterIds);
    } catch {
      // If not JSON, try comma-separated string
      if (bodyData.characterIds.includes(',')) {
        bodyData.characterIds = bodyData.characterIds.split(',').map((id: string) => id.trim()).filter((id: string) => id.length > 0);
      } else {
        bodyData.characterIds = bodyData.characterIds.trim() ? [bodyData.characterIds.trim()] : [];
      }
    }
  }
  // Handle field name variations
  if (bodyData.Characters && !bodyData.characterIds) {
    if (typeof bodyData.Characters === 'string') {
      try {
        bodyData.characterIds = JSON.parse(bodyData.Characters);
      } catch {
        if (bodyData.Characters.includes(',')) {
          bodyData.characterIds = bodyData.Characters.split(',').map((id: string) => id.trim()).filter((id: string) => id.length > 0);
        } else {
          bodyData.characterIds = bodyData.Characters.trim() ? [bodyData.Characters.trim()] : [];
        }
      }
    } else if (Array.isArray(bodyData.Characters)) {
      bodyData.characterIds = bodyData.Characters;
    }
  }

  // Parse personaIds array from form-data (comes as stringified JSON or comma-separated)
  if (typeof bodyData.personaIds === 'string') {
    try {
      bodyData.personaIds = JSON.parse(bodyData.personaIds);
    } catch {
      // If not JSON, try comma-separated string
      if (bodyData.personaIds.includes(',')) {
        bodyData.personaIds = bodyData.personaIds.split(',').map((id: string) => id.trim()).filter((id: string) => id.length > 0);
      } else {
        bodyData.personaIds = bodyData.personaIds.trim() ? [bodyData.personaIds.trim()] : [];
      }
    }
  }
  // Handle field name variations
  if (bodyData.persona && !bodyData.personaIds) {
    if (typeof bodyData.persona === 'string') {
      try {
        bodyData.personaIds = JSON.parse(bodyData.persona);
      } catch {
        if (bodyData.persona.includes(',')) {
          bodyData.personaIds = bodyData.persona.split(',').map((id: string) => id.trim()).filter((id: string) => id.length > 0);
        } else {
          bodyData.personaIds = bodyData.persona.trim() ? [bodyData.persona.trim()] : [];
        }
      }
    } else if (Array.isArray(bodyData.persona)) {
      bodyData.personaIds = bodyData.persona;
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

  // Map frontend field names to API field names
  const mappedData: any = {
    ...bodyData,
  };

  if (bodyData.lorebookName || bodyData.name) {
    mappedData.name = bodyData.lorebookName || bodyData.name;
  }
  if (bodyData.visiable || bodyData.visibility) {
    mappedData.visibility = bodyData.visiable || bodyData.visibility;
  }
  if (avatar !== null) {
    mappedData.avatar = avatar;
  }

  // Remove frontend-specific fields
  delete mappedData.lorebookName;
  delete mappedData.visiable;
  delete mappedData.Characters; // Remove frontend field name (use characterIds)
  delete mappedData.persona; // Remove frontend field name (use personaIds)

  // Handle favourite separately (if provided as string 'true'/'false')
  if (mappedData.favourite !== undefined) {
    mappedData.isFavourite = mappedData.favourite === 'true' || mappedData.favourite === true;
    delete mappedData.favourite;
  }

  // Validate request body
  const validatedData = updateLorebookSchema.parse(mappedData);

  // Update lorebook
  const result = await lorebookService.updateLorebook(lorebookId, userId, validatedData);

  sendSuccess(res, result, 'Lorebook updated successfully');
}

// ============================================
// DELETE /api/v1/lorebooks/:id - Delete Lorebook
// ============================================

export const DELETE = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  if (!id) {
    throw new Error('Lorebook ID is required');
  }
  const user = requireCurrentUser(req);

  // Delete lorebook
  const result = await lorebookService.deleteLorebook(id, user.id);

  sendSuccess(res, result, result.message);
};

