import type { Request, Response } from 'express';
import { z } from 'zod';
import { sendSuccess } from '../../../utils/response.js';
import { getPresignedViewUrl } from '../../../lib/s3.service.js';
import { getS3Client } from '../../../lib/s3.service.js';
import { createError } from '../../../utils/index.js';

// ============================================
// POST /api/v1/upload/view-url - Get presigned URL for viewing private S3 images
// ============================================

const viewUrlSchema = z.object({
  url: z.string().url('Valid URL is required'),
  expiresIn: z.number().min(60).max(86400).optional().default(3600), // 1 min to 24 hours
});

export const POST = async (req: Request, res: Response): Promise<void> => {
  const parsed = viewUrlSchema.safeParse(req.body);
  if (!parsed.success) {
    const messages = parsed.error.issues.map((issue: { message: string }) => issue.message).join(', ');
    throw createError.badRequest(`Invalid request: ${messages}`);
  }

  const { url, expiresIn } = parsed.data;

  // Check S3 is configured
  const s3Client = getS3Client();
  if (!s3Client) {
    throw createError.badRequest('S3 is not configured.');
  }

  const viewUrl = await getPresignedViewUrl(url, expiresIn);

  sendSuccess(res, {
    viewUrl,
    expiresIn,
  });
};
