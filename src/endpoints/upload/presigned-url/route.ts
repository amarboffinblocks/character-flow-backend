import type { Request, Response } from 'express';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { sendSuccess } from '../../../utils/response.js';
import {
  getCloudinaryDirectUploadParams,
  isCloudinaryConfigured,
} from '../../../lib/cloudinary.service.js';
import { UPLOAD_CONSTANTS } from '../../../core/constants/index.js';
import { createError } from '../../../utils/index.js';

// ============================================
// POST /api/v1/upload/presigned-url
// Returns signed fields for Cloudinary direct upload (multipart POST to uploadUrl)
// ============================================

const bodySchema = z.object({
  folder: z.enum(['characters', 'lorebooks', 'personas', 'realms', 'backgrounds', 'users']),
  contentType: z.enum(UPLOAD_CONSTANTS.ALLOWED_TYPES as unknown as [string, ...string[]]),
  filename: z.string().optional(),
});

export const POST = async (req: Request, res: Response): Promise<void> => {
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    const messages = parsed.error.issues.map((issue: { message: string }) => issue.message).join(', ');
    throw createError.badRequest(`Invalid request: ${messages}`);
  }

  const { folder } = parsed.data;

  if (!isCloudinaryConfigured()) {
    throw createError.badRequest(
      'Direct upload is not available. Cloudinary is not configured. Use multipart upload instead.'
    );
  }

  const publicId = nanoid(12);

  const params = getCloudinaryDirectUploadParams(folder, publicId);

  sendSuccess(
    res,
    {
      uploadUrl: params.uploadUrl,
      uploadMethod: params.uploadMethod,
      formFields: params.formFields,
      cloudName: params.cloudName,
      publicId: params.publicId,
      folder: params.folder,
    },
    'POST multipart/form-data to uploadUrl with formFields plus a `file` field. Response includes secure_url.',
    201
  );
};
