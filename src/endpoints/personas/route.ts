import type { Request, Response } from 'express';
import { personaService, personaQuerySchema, createPersonaSchema } from '../../modules/persona/index.js';
import { sendSuccess } from '../../utils/response.js';
import { requireCurrentUser } from '../../middleware/auth.middleware.js';
import type { AuthenticatedRequest } from '../../types/index.js';
import { personaImageUpload } from '../../middleware/upload.middleware.js';
import { processImageUpload } from '../../utils/image.helper.js';

// ============================================
// GET /api/v1/personas - List Personas
// ============================================

export const GET = async (req: Request, res: Response): Promise<void> => {
  // Parse query parameters
  const queryParams = personaQuerySchema.parse(req.query);

  // Get current user if authenticated
  const user = (req as AuthenticatedRequest).user;

  if (queryParams.visibility === 'public') {
    const result = await personaService.listPublicPersonas(queryParams, user?.id);
    sendSuccess(res, result, 'Public personas retrieved successfully');
    return;
  }

  if (queryParams.visibility === 'private') {
    const currentUser = requireCurrentUser(req);
    const result = await personaService.listPersonas(currentUser.id, queryParams);
    sendSuccess(res, result, 'Private personas retrieved successfully');
    return;
  }

  if (user) {
    const result = await personaService.listAccessiblePersonas(user.id, queryParams);
    sendSuccess(res, result, 'Personas retrieved successfully');
  } else {
    const result = await personaService.listPublicPersonas(queryParams);
    sendSuccess(res, result, 'Public personas retrieved successfully');
  }
};

// ============================================
// POST /api/v1/personas - Create Persona
// ============================================

export const POST = async (req: Request, res: Response): Promise<void> => {
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
          await processPersonaCreation(req, res, user.id);
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
    await processPersonaCreation(req, res, user.id);
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

async function processPersonaCreation(
  req: Request,
  res: Response,
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

  // Handle backgroundImage - prioritize uploaded file, then JSON data
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
  const mappedData = {
    ...bodyData,
    name: bodyData.personaName || bodyData.name,
    description: bodyData.details || bodyData.description,
    visibility: bodyData.visiable || bodyData.visibility,
    avatar,
    backgroundImg,
    // Handle lorebookId - map from 'lorebook' field or use 'lorebookId' directly
    lorebookId: bodyData.lorebook || bodyData.lorebookId || undefined,
  };

  // Remove frontend-specific fields
  delete mappedData.personaName;
  delete mappedData.details;
  delete mappedData.visiable;
  delete mappedData.backgroundImage;
  delete mappedData.lorebook; // Remove frontend field name

  // Handle favourite separately (if provided as string 'true'/'false')
  const shouldFavourite = mappedData.favourite === 'true' || mappedData.favourite === true;
  delete mappedData.favourite; // Handle separately after creation

  // Validate request body
  const validatedData = createPersonaSchema.parse(mappedData);

  // Convert null to undefined for optional fields to match CreatePersonaInput type
  const input = {
    ...validatedData,
    description: validatedData.description ?? undefined,
    avatar: validatedData.avatar ?? undefined,
    backgroundImg: validatedData.backgroundImg ?? undefined,
    lorebookId: validatedData.lorebookId ?? undefined,
  };

  // Create persona
  const result = await personaService.createPersona(userId, input);

  // Handle favourite toggle if needed
  if (shouldFavourite && result.persona.id) {
    try {
      await personaService.toggleFavourite(result.persona.id, userId);
      // Refresh persona to get updated favourite status
      const updatedPersona = await personaService.getPersonaById(result.persona.id, userId);
      result.persona = updatedPersona.persona;
    } catch (error) {
      // Don't fail the entire operation if favourite toggle fails
      console.warn('Failed to set favourite status:', error);
    }
  }

  sendSuccess(res, result, 'Persona created successfully', 201);
}
