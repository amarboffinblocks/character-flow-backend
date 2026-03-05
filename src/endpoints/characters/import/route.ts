import type { Request, Response } from 'express';
import { characterService } from '../../../modules/character/index.js';
import { sendSuccess } from '../../../utils/response.js';
import { requireCurrentUser } from '../../../middleware/auth.middleware.js';
import multer from 'multer';
import { createError } from '../../../utils/errors.js';
import {
  parseCharacterFromJson,
  parseCharacterFromPng,
  type NormalizedCharacterData,
} from '../../../utils/character-card.parser.js';
import { processImageUpload } from '../../../utils/image.helper.js';

// ============================================
// Multer Configuration for Import
// ============================================

const storage = multer.memoryStorage();

// Allow JSON and PNG files for character import (V1/V2 formats + PNG with embedded metadata)
const fileFilter = (
  req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
): void => {
  const allowedMimeTypes = [
    'application/json',
    'image/png',
    'image/jpeg',
    'image/jpg',
  ];

  if (file.mimetype && allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      createError.badRequest(
        `Invalid file type. Allowed types: JSON (V1/V2), PNG, JPEG, JPG (with embedded character metadata)`
      ) as unknown as Error
    );
  }
};

export const characterImportUpload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
    files: 1,
  },
  fileFilter,
}).single('file');

// ============================================
// POST /api/v1/characters/import - Import Character
// ============================================

export const POST = async (req: Request, res: Response): Promise<void> => {
  const user = requireCurrentUser(req);

  return new Promise<void>((resolve, reject) => {
    characterImportUpload(req, res, async (err) => {
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
              message: 'File is required',
            },
          });
          return resolve();
        }

        let characterData: NormalizedCharacterData;

        if (file.mimetype === 'application/json') {
          // Parse JSON file (V1 or V2 format)
          try {
            const jsonString = file.buffer.toString('utf-8');
            characterData = parseCharacterFromJson(jsonString);
          } catch (parseError) {
            res.status(400).json({
              success: false,
              error: {
                code: 'VALIDATION_ERROR',
                message: parseError instanceof Error ? parseError.message : 'Invalid JSON or character card format',
              },
            });
            return resolve();
          }
        } else if (file.mimetype === 'image/png') {
          // Extract metadata from PNG character card
          try {
            characterData = parseCharacterFromPng(file.buffer);
            // Upload PNG as avatar (the card image is the character portrait)
            const avatarMetadata = await processImageUpload(file, 'characters');
            if (avatarMetadata) {
              characterData.avatar = avatarMetadata.url;
            }
          } catch (parseError) {
            res.status(400).json({
              success: false,
              error: {
                code: 'VALIDATION_ERROR',
                message: parseError instanceof Error ? parseError.message : 'Failed to extract character metadata from PNG',
              },
            });
            return resolve();
          }
        } else if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/jpg') {
          // JPEG: Character card metadata is typically in PNG only. Reject with helpful message.
          res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'JPEG character cards are not supported. Please use PNG format (with embedded chara/chara_card_v2 metadata) or JSON.',
            },
          });
          return resolve();
        } else {
          res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Unsupported file type',
            },
          });
          return resolve();
        }

        // Map normalized data to import format (avatar/backgroundImg as URLs)
        const importPayload = {
          ...characterData,
          avatar: characterData.avatar || undefined,
          backgroundImg: characterData.backgroundImg || undefined,
        };

        // Import character using the service
        const result = await characterService.importCharacter(user.id, importPayload);

        sendSuccess(res, result, 'Character imported successfully', 201);
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
