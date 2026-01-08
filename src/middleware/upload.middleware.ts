import multer from 'multer';
import { config } from '../config/index.js';
import { UPLOAD_CONSTANTS } from '../core/constants/index.js';
import { createError } from '../utils/errors.js';

// ============================================
// Multer Configuration
// ============================================

const storage = multer.memoryStorage(); // Store files in memory for processing

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

// Multer instance for character image uploads
export const characterImageUpload = multer({
  storage,
  limits: {
    fileSize: UPLOAD_CONSTANTS.MAX_SIZE,
    files: 2, // avatar and backgroundImage
  },
  fileFilter,
}).fields([
  { name: 'avatar', maxCount: 1 },
  { name: 'backgroundImage', maxCount: 1 },
]);

// Multer instance for lorebook image uploads
export const lorebookImageUpload = multer({
  storage,
  limits: {
    fileSize: UPLOAD_CONSTANTS.MAX_SIZE,
    files: 1, // avatar only
  },
  fileFilter,
}).fields([
  { name: 'avatar', maxCount: 1 },
]);

// Multer instance for persona image uploads
export const personaImageUpload = multer({
  storage,
  limits: {
    fileSize: UPLOAD_CONSTANTS.MAX_SIZE,
    files: 2, // avatar and backgroundImage
  },
  fileFilter,
}).fields([
  { name: 'avatar', maxCount: 1 },
  { name: 'backgroundImage', maxCount: 1 },
]);
