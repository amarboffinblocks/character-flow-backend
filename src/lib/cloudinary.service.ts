import { Readable } from 'stream';
import { v2 as cloudinary } from 'cloudinary';
import { config } from '../config/index.js';
import { logger } from './logger.js';

// ============================================
// Cloudinary — image upload, delivery, delete
// ============================================

let configured = false;

const ensureConfig = (): void => {
  if (configured) return;
  const { cloudName, apiKey, apiSecret } = config.cloudinary;
  if (!cloudName || !apiKey || !apiSecret) {
    return;
  }
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
  configured = true;
};

export const isCloudinaryConfigured = (): boolean => {
  ensureConfig();
  return !!(config.cloudinary.cloudName && config.cloudinary.apiKey && config.cloudinary.apiSecret);
};

/**
 * Upload a buffer; returns HTTPS delivery URL (secure_url)
 */
export const uploadImageBuffer = async (
  buffer: Buffer,
  folder: string,
  _contentType: string
): Promise<string> => {
  ensureConfig();
  if (!isCloudinaryConfigured()) {
    throw new Error('Cloudinary is not configured (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET).');
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
      },
      (error, result) => {
        if (error || !result?.secure_url) {
          reject(error ?? new Error('Cloudinary upload failed'));
          return;
        }
        resolve(result.secure_url);
      }
    );
    Readable.from(buffer).pipe(uploadStream);
  });
};

export type CloudinaryDirectUploadParams = {
  uploadUrl: string;
  uploadMethod: 'POST';
  formFields: Record<string, string>;
  cloudName: string;
  publicId: string;
  folder: string;
};

/**
 * Params for browser/mobile to POST multipart to Cloudinary.
 * Append `file` as the last multipart field.
 */
export const getCloudinaryDirectUploadParams = (
  folder: string,
  publicId: string
): CloudinaryDirectUploadParams => {
  ensureConfig();
  const { cloudName, apiKey, apiSecret } = config.cloudinary;
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('Cloudinary is not configured.');
  }

  const timestamp = Math.round(Date.now() / 1000);
  const paramsToSign: Record<string, string | number> = {
    timestamp,
    folder,
    public_id: publicId,
  };
  const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret);

  return {
    uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    uploadMethod: 'POST',
    formFields: {
      api_key: apiKey,
      timestamp: String(timestamp),
      signature,
      folder,
      public_id: publicId,
    },
    cloudName,
    publicId,
    folder,
  };
};

/**
 * Extract public_id from a res.cloudinary.com delivery URL (handles /upload/, optional transforms, v123...)
 */
export const extractPublicIdFromCloudinaryUrl = (url: string): string | null => {
  if (!url || !url.includes('res.cloudinary.com')) return null;
  try {
    const pathname = new URL(url).pathname;
    const segments = pathname.split('/').filter(Boolean);
    const uploadIdx = segments.indexOf('upload');
    if (uploadIdx < 0) return null;
    let i = uploadIdx + 1;
    while (i < segments.length && segments[i]!.includes(',')) i += 1;
    const versionSeg = segments[i];
    if (i < segments.length && versionSeg && /^v\d+$/i.test(versionSeg)) i += 1;
    const idParts = segments.slice(i);
    if (idParts.length === 0) return null;
    const last = idParts[idParts.length - 1];
    if (last === undefined) return null;
    idParts[idParts.length - 1] = last.replace(/\.[a-z0-9]+$/i, '');
    return idParts.join('/');
  } catch {
    return null;
  }
};

/**
 * Remove image from Cloudinary when replacing or deleting entities. No-op if URL is not ours.
 */
export const deleteUploadedImageIfExists = async (url: string): Promise<void> => {
  if (!isCloudinaryConfigured()) return;

  const publicId = extractPublicIdFromCloudinaryUrl(url);
  if (!publicId) return;

  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'image', invalidate: true });
  } catch (error) {
    logger.warn({ err: error, publicId, url }, 'Failed to delete Cloudinary asset during cleanup');
  }
};

/**
 * Stored assets use public HTTPS URLs; no presigning. Passthrough for API compatibility.
 */
export const transformEntityImageUrls = async <T>(entity: T): Promise<T> => entity;

/**
 * @deprecated alias
 */
export const transformCharacterImageUrls = transformEntityImageUrls;

export const transformEntitiesImageUrls = async <T>(entities: T[]): Promise<T[]> => entities;

/**
 * @deprecated alias
 */
export const transformCharactersImageUrls = transformEntitiesImageUrls;

/**
 * Resolve a stored image URL for display (Cloudinary URLs are already public).
 */
export const resolveImageViewUrl = async (url: string): Promise<string> => {
  if (!url) return url;
  if (url.startsWith('/uploads/')) return url;
  return url;
};
