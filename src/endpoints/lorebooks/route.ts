import type { Request, Response } from 'express';
import { lorebookService, lorebookQuerySchema, createLorebookSchema } from '../../modules/lorebook/index.js';
import { sendSuccess } from '../../utils/response.js';
import { requireCurrentUser } from '../../middleware/auth.middleware.js';
import type { AuthenticatedRequest } from '../../types/index.js';
import { lorebookImageUpload } from '../../middleware/upload.middleware.js';
import { processImageUpload } from '../../utils/image.helper.js';

// ============================================
// GET /api/v1/lorebooks - List Lorebooks
// ============================================

export const GET = async (req: Request, res: Response): Promise<void> => {
  // Parse query parameters
  const queryParams = lorebookQuerySchema.parse(req.query);

  // Get current user if authenticated
  const user = (req as AuthenticatedRequest).user;

  if (user) {
    // If authenticated, get user's lorebooks
    const result = await lorebookService.getUserLorebooks(user.id, queryParams);
    sendSuccess(res, result, 'Lorebooks retrieved successfully');
  } else {
    // If not authenticated, get public lorebooks
    const result = await lorebookService.getPublicLorebooks(queryParams);
    sendSuccess(res, result, 'Public lorebooks retrieved successfully');
  }
};

// ============================================
// POST /api/v1/lorebooks - Create Lorebook
// ============================================

export const POST = async (req: Request, res: Response): Promise<void> => {
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
          await processLorebookCreation(req, res, user.id);
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
    await processLorebookCreation(req, res, user.id);
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

async function processLorebookCreation(
  req: Request,
  res: Response,
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

  // Handle avatar - prioritize uploaded file, then JSON data
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
  const mappedData = {
    ...bodyData,
    name: bodyData.lorebookName || bodyData.name,
    visibility: bodyData.visiable || bodyData.visibility,
    avatar,
  };

  // Remove frontend-specific fields
  delete mappedData.lorebookName;
  delete mappedData.visiable;
  delete mappedData.Characters; // Remove frontend field name (use characterIds)
  delete mappedData.persona; // Remove frontend field name (use personaIds)

  // Handle favourite separately (if provided as string 'true'/'false')
  const shouldFavourite = mappedData.favourite === 'true' || mappedData.favourite === true;
  delete mappedData.favourite; // Handle separately after creation

  // Validate request body
  const validatedData = createLorebookSchema.parse(mappedData);

  // Convert null to undefined for optional fields to match CreateLorebookInput type
  const input = {
    ...validatedData,
    description: validatedData.description ?? undefined,
    avatar: validatedData.avatar ?? undefined,
    characterIds: validatedData.characterIds && validatedData.characterIds.length > 0 ? validatedData.characterIds : undefined,
    personaIds: validatedData.personaIds && validatedData.personaIds.length > 0 ? validatedData.personaIds : undefined,
  };

  // Create lorebook
  const result = await lorebookService.createLorebook(userId, input);

  // Handle favourite toggle if needed
  if (shouldFavourite && result.lorebook.id) {
    try {
      await lorebookService.toggleFavourite(result.lorebook.id, userId);
      // Refresh lorebook to get updated favourite status
      const updatedLorebook = await lorebookService.getLorebookById(result.lorebook.id, userId);
      result.lorebook = updatedLorebook.lorebook;
    } catch (error) {
      // Don't fail the entire operation if favourite toggle fails
      console.warn('Failed to set favourite status:', error);
    }
  }

  sendSuccess(res, result, 'Lorebook created successfully', 201);
}

