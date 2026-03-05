import sharp from 'sharp';
import { nanoid } from 'nanoid';
import { UPLOAD_CONSTANTS } from '../core/constants/index.js';
import { createError } from './errors.js';
import { uploadToS3, getS3Client } from '../lib/s3.service.js';

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
 * Processes uploaded image and returns metadata
 * Uploads to AWS S3 only - local storage fallback is disabled
 */
export const processImageUpload = async (
  file: Express.Multer.File | undefined,
  folder: 'characters' | 'lorebooks' | 'personas' | 'realms' | 'backgrounds' | 'users' = 'characters'
): Promise<ImageMetadata | null> => {
  if (!file) {
    return null;
  }

  validateImageFile(file);

  const s3Client = getS3Client();
  if (!s3Client) {
    throw createError.unavailable(
      'Image upload is not available. AWS S3 must be configured (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_S3_BUCKET).'
    );
  }

  // Generate unique filename
  const originalName = file.originalname || 'image';
  const fileExtension = originalName.split('.').pop() || 'jpg';
  const filename = `${nanoid(12)}.${fileExtension}`;
  const s3Key = `${folder}/${filename}`;

  // Process image with sharp to get dimensions and optimize
  const image = sharp(file.buffer || file.path);
  const metadata = await image.metadata();

  const optimizedBuffer = await image.toBuffer();
  const url = await uploadToS3(optimizedBuffer, s3Key, file.mimetype || 'image/jpeg');

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

