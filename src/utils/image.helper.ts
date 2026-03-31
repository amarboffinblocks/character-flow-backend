import sharp from 'sharp';
import { nanoid } from 'nanoid';
import { UPLOAD_CONSTANTS } from '../core/constants/index.js';
import { createError } from './errors.js';
import { isCloudinaryConfigured, uploadImageBuffer } from '../lib/cloudinary.service.js';

// ============================================
// Image Processing Utilities
// ============================================

export interface ImageMetadata {
  url: string;
  width: number;
  height: number;
}

/**
 * Validates image file
 */
export const validateImageFile = (file: Express.Multer.File | undefined): void => {
  if (!file) {
    return; // Optional field, so undefined is OK
  }

  // Check file type
  if (!file.mimetype || !UPLOAD_CONSTANTS.ALLOWED_TYPES.includes(file.mimetype as typeof UPLOAD_CONSTANTS.ALLOWED_TYPES[number])) {
    throw createError.badRequest(
      `Invalid file type. Allowed types: ${UPLOAD_CONSTANTS.ALLOWED_TYPES.join(', ')}`
    );
  }

  // Check file size
  if (file.size > UPLOAD_CONSTANTS.MAX_SIZE) {
    throw createError.badRequest(
      `File size exceeds maximum allowed size of ${UPLOAD_CONSTANTS.MAX_SIZE / 1024 / 1024}MB`
    );
  }
};

/**
 * Processes uploaded image and returns metadata (uploads to Cloudinary)
 */
export const processImageUpload = async (
  file: Express.Multer.File | undefined,
  folder: 'characters' | 'lorebooks' | 'personas' | 'realms' | 'backgrounds' | 'users' = 'characters'
): Promise<ImageMetadata | null> => {
  if (!file) {
    return null;
  }

  validateImageFile(file);

  if (!isCloudinaryConfigured()) {
    throw createError.unavailable(
      'Image upload is not available. Configure Cloudinary (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET).'
    );
  }

  const image = sharp(file.buffer || file.path);
  const metadata = await image.metadata();

  const optimizedBuffer = await image.toBuffer();
  const url = await uploadImageBuffer(optimizedBuffer, folder, file.mimetype || 'image/jpeg');

  return {
    url,
    width: metadata.width || 0,
    height: metadata.height || 0,
  };
};

/**
 * Processes multiple image uploads
 */
export const processMultipleImageUploads = async (
  files: Express.Multer.File[] | undefined,
  folder: 'characters' | 'lorebooks' | 'personas' | 'realms' | 'backgrounds' | 'users' = 'characters'
): Promise<ImageMetadata[]> => {
  if (!files || files.length === 0) {
    return [];
  }

  if (files.length > UPLOAD_CONSTANTS.MAX_FILES) {
    throw createError.badRequest(
      `Maximum ${UPLOAD_CONSTANTS.MAX_FILES} files allowed`
    );
  }

  const results = await Promise.all(
    files.map((file) => processImageUpload(file, folder))
  );

  return results.filter((result): result is ImageMetadata => result !== null);
};
