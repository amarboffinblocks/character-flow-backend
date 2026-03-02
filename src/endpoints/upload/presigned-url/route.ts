import type { Request, Response } from 'express';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { sendSuccess } from '../../../utils/response.js';
import { getPresignedUploadUrl } from '../../../lib/s3.service.js';
import { getS3Client } from '../../../lib/s3.service.js';
import { UPLOAD_CONSTANTS } from '../../../core/constants/index.js';
import { createError } from '../../../utils/index.js';

// ============================================
// POST /api/v1/upload/presigned-url - Get presigned URL for direct upload
// ============================================

const presignedUrlSchema = z.object({
  folder: z.enum(['characters', 'lorebooks', 'personas', 'realms', 'backgrounds', 'users']),
  contentType: z.enum(UPLOAD_CONSTANTS.ALLOWED_TYPES as unknown as [string, ...string[]]),
  filename: z.string().optional(), // Optional: client can suggest filename (extension used for key)
});

export const POST = async (req: Request, res: Response): Promise<void> => {
  const parsed = presignedUrlSchema.safeParse(req.body);
  if (!parsed.success) {
    const messages = parsed.error.issues.map((issue: { message: string }) => issue.message).join(', ');
    throw createError.badRequest(`Invalid request: ${messages}`);
  }

  const { folder, contentType, filename } = parsed.data;

  // Check S3 is configured
  const s3Client = getS3Client();
  if (!s3Client) {
    throw createError.badRequest(
      'Direct upload is not available. S3 is not configured. Use multipart upload instead.'
    );
  }

  // Generate unique key
  const ext = filename?.includes('.')
    ? filename.split('.').pop()?.toLowerCase() || 'jpg'
    : contentType.split('/')[1] || 'jpg';
  const safeExt = ['jpeg', 'jpg', 'png', 'webp', 'gif'].includes(ext) ? ext : 'jpg';
  const key = `${folder}/${nanoid(12)}.${safeExt}`;

  const { uploadUrl, publicUrl, viewUrl } = await getPresignedUploadUrl(key, contentType);

  sendSuccess(
    res,
    {
      uploadUrl,
      publicUrl,
      viewUrl, // Use this for img src (works with private buckets, valid 1 hour)
      key,
      expiresIn: 900, // 15 minutes for upload
      viewExpiresIn: 3600, // 1 hour for view
    },
    'Presigned URL generated successfully',
    201
  );
};
