import sharp from 'sharp';
import { promises as fs } from 'fs';
import { join } from 'path';
import { nanoid } from 'nanoid';
import { config } from '../config/index.js';
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
 * Uploads to S3 if configured, otherwise saves to local disk
 */
export const processImageUpload = async (
  file: Express.Multer.File | undefined,
  folder: 'characters' | 'lorebooks' | 'personas' | 'realms' = 'characters'
): Promise<ImageMetadata | null> => {
  if (!file) {
    return null;
  }

  validateImageFile(file);

  // Generate unique filename
  const originalName = file.originalname || 'image';
  const fileExtension = originalName.split('.').pop() || 'jpg';
  const filename = `${nanoid(12)}.${fileExtension}`;
  const s3Key = `${folder}/${filename}`;

  // Process image with sharp to get dimensions and optimize
  const image = sharp(file.buffer || file.path);
  const metadata = await image.metadata();

  // Check if S3 is configured
  const s3Client = getS3Client();
  
  if (s3Client) {
    // Upload to S3
    const optimizedBuffer = await image.toBuffer();
    const url = await uploadToS3(optimizedBuffer, s3Key, file.mimetype || 'image/jpeg');
    
    return {
      url,
      width: metadata.width || 0,
      height: metadata.height || 0,
    };
  } else {
    // Fallback to local storage
    const uploadDir = join(config.upload.dir, folder);
    await fs.mkdir(uploadDir, { recursive: true });
    const filepath = join(uploadDir, filename);
    await image.toFile(filepath);
    
    const url = `/uploads/${folder}/${filename}`;
    
    return {
      url,
      width: metadata.width || 0,
      height: metadata.height || 0,
    };
  }
};

/**
 * Processes multiple image uploads
 */
export const processMultipleImageUploads = async (
  files: Express.Multer.File[] | undefined,
  folder: 'characters' | 'lorebooks' | 'personas' | 'realms' = 'characters'
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

