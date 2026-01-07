import type { Request, Response } from 'express';
import { characterService, updateCharacterSchema } from '../../../modules/character/index.js';
import { sendSuccess } from '../../../utils/response.js';
import { requireCurrentUser } from '../../../middleware/auth.middleware.js';
import type { AuthenticatedRequest } from '../../../types/index.js';
import { characterImageUpload } from '../../../middleware/upload.middleware.js';
import { processImageUpload } from '../../../utils/image.helper.js';

// ============================================
// GET /api/v1/characters/:id - Get Character By ID
// ============================================

export const GET = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  if (!id) {
    throw new Error('Character ID is required');
  }
  const user = (req as AuthenticatedRequest).user;

  const result = await characterService.getCharacterById(id, user?.id);
  sendSuccess(res, result, 'Character retrieved successfully');
};

// ============================================
// PUT /api/v1/characters/:id - Update Character
// ============================================

export const PUT = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  if (!id) {
    throw new Error('Character ID is required');
  }
  const user = requireCurrentUser(req);

  // Check if request is multipart/form-data
  const isMultipart = req.headers['content-type']?.includes('multipart/form-data');

  // Handle file uploads if multipart
  if (isMultipart) {
    return new Promise<void>((resolve, reject) => {
      characterImageUpload(req, res, async (err) => {
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
          await processCharacterUpdate(req, res, id, user.id);
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
    await processCharacterUpdate(req, res, id, user.id);
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

async function processCharacterUpdate(
  req: Request,
  res: Response,
  characterId: string,
  userId: string
): Promise<void> {
  // Process uploaded images if any
  const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

  let avatarMetadata = null;
  let backgroundImgMetadata = null;

  if (files?.avatar?.[0]) {
    avatarMetadata = await processImageUpload(files.avatar[0], 'characters');
  }

  if (files?.['backgroundImage']?.[0]) {
    backgroundImgMetadata = await processImageUpload(files['backgroundImage'][0], 'characters');
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

  // Handle alternateMessages array
  if (typeof bodyData.alternateMessages === 'string') {
    try {
      bodyData.alternateMessages = JSON.parse(bodyData.alternateMessages);
    } catch {
      // If it's form-data array format, parse it
      const alternateMessagesArray: string[] = [];
      let index = 0;
      while (bodyData[`alternateMessages[${index}]`]) {
        alternateMessagesArray.push(bodyData[`alternateMessages[${index}]`]);
        delete bodyData[`alternateMessages[${index}]`];
        index++;
      }
      bodyData.alternateMessages = alternateMessagesArray.length > 0 ? alternateMessagesArray : undefined;
    }
  } else if (!Array.isArray(bodyData.alternateMessages)) {
    // Handle form-data array format
    const alternateMessagesArray: string[] = [];
    let index = 0;
    while (bodyData[`alternateMessages[${index}]`]) {
      alternateMessagesArray.push(bodyData[`alternateMessages[${index}]`]);
      delete bodyData[`alternateMessages[${index}]`];
      index++;
    }
    if (alternateMessagesArray.length > 0) {
      bodyData.alternateMessages = alternateMessagesArray;
    }
  }

  // Handle exampleDialogues array
  if (typeof bodyData.exampleDialogues === 'string') {
    try {
      bodyData.exampleDialogues = JSON.parse(bodyData.exampleDialogues);
    } catch {
      // If it's form-data array format, parse it
      const exampleDialoguesArray: string[] = [];
      let index = 0;
      while (bodyData[`exampleDialogues[${index}]`]) {
        exampleDialoguesArray.push(bodyData[`exampleDialogues[${index}]`]);
        delete bodyData[`exampleDialogues[${index}]`];
        index++;
      }
      bodyData.exampleDialogues = exampleDialoguesArray.length > 0 ? exampleDialoguesArray : undefined;
    }
  } else if (!Array.isArray(bodyData.exampleDialogues)) {
    // Handle form-data array format
    const exampleDialoguesArray: string[] = [];
    let index = 0;
    while (bodyData[`exampleDialogues[${index}]`]) {
      exampleDialoguesArray.push(bodyData[`exampleDialogues[${index}]`]);
      delete bodyData[`exampleDialogues[${index}]`];
      index++;
    }
    if (exampleDialoguesArray.length > 0) {
      bodyData.exampleDialogues = exampleDialoguesArray;
    }
  }

  // Handle exampleDialogue (singular) field name from frontend
  if (bodyData.exampleDialogue) {
    if (Array.isArray(bodyData.exampleDialogue)) {
      bodyData.exampleDialogues = bodyData.exampleDialogue;
    } else {
      bodyData.exampleDialogues = [bodyData.exampleDialogue];
    }
    delete bodyData.exampleDialogue;
  }

  // Handle avatar - prioritize uploaded file, then existing string value
  let avatar = avatarMetadata;
  if (!avatar && bodyData.avatar) {
    if (typeof bodyData.avatar === 'string') {
      try {
        avatar = JSON.parse(bodyData.avatar);
      } catch {
        // If parsing fails, it's likely a URL string - keep as is but wrap in object format
        // The service will handle URL strings
        avatar = bodyData.avatar as any;
      }
    } else {
      avatar = bodyData.avatar;
    }
  }

  // Handle backgroundImg - prioritize uploaded file, then existing string value
  let backgroundImg = backgroundImgMetadata;
  if (!backgroundImg && bodyData.backgroundImage) {
    if (typeof bodyData.backgroundImage === 'string') {
      try {
        backgroundImg = JSON.parse(bodyData.backgroundImage);
      } catch {
        // If parsing fails, it's likely a URL string - keep as is but wrap in object format
        // The service will handle URL strings
        backgroundImg = bodyData.backgroundImage as any;
      }
    } else {
      backgroundImg = bodyData.backgroundImage;
    }
  }

  // Map frontend field names to API field names
  const mappedData: any = {
    ...bodyData,
  };

  // Only map fields that are present
  if (bodyData.characterName !== undefined || bodyData.name !== undefined) {
    mappedData.name = bodyData.characterName || bodyData.name;
  }
  if (bodyData.visiable !== undefined || bodyData.visibility !== undefined) {
    mappedData.visibility = bodyData.visiable || bodyData.visibility;
  }
  if (bodyData.personality !== undefined || bodyData.summary !== undefined) {
    mappedData.summary = bodyData.personality || bodyData.summary;
  }
  if (avatar !== null) {
    mappedData.avatar = avatar;
  }
  if (backgroundImg !== null) {
    mappedData.backgroundImg = backgroundImg;
  }
  if (bodyData.exampleDialogues !== undefined) {
    mappedData.exampleDialogues = bodyData.exampleDialogues;
  }

  // Handle favourite field
  if (bodyData.favourite !== undefined) {
    mappedData.isFavourite = bodyData.favourite === 'true' || bodyData.favourite === true;
  }

  // Remove frontend-specific fields
  delete mappedData.characterName;
  delete mappedData.visiable;
  delete mappedData.personality;
  delete mappedData.exampleDialogue;
  delete mappedData.backgroundImage;
  delete mappedData.favourite;

  // Validate request body
  const validatedData = updateCharacterSchema.parse(mappedData);

  // Convert null to undefined for optional fields to match UpdateCharacterInput type
  const input = {
    ...validatedData,
    description: validatedData.description ?? undefined,
    scenario: validatedData.scenario ?? undefined,
    summary: validatedData.summary ?? undefined,
    avatar: validatedData.avatar ?? undefined,
    backgroundImg: validatedData.backgroundImg ?? undefined,
    firstMessage: validatedData.firstMessage ?? undefined,
    authorNotes: validatedData.authorNotes ?? undefined,
    characterNotes: validatedData.characterNotes ?? undefined,
    authorName: validatedData.authorName ?? undefined,
    personaId: validatedData.personaId ?? undefined,
    lorebookId: validatedData.lorebookId ?? undefined,
    realmId: validatedData.realmId ?? undefined,
  };

  // Update character
  const result = await characterService.updateCharacter(characterId, userId, input);

  sendSuccess(res, result, 'Character updated successfully');
}

// ============================================
// DELETE /api/v1/characters/:id - Delete Character
// ============================================

export const DELETE = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  if (!id) {
    throw new Error('Character ID is required');
  }
  const user = requireCurrentUser(req);

  // Delete character
  const result = await characterService.deleteCharacter(id, user.id);

  sendSuccess(res, result, result.message);
};

