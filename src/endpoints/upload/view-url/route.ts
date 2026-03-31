import type { Request, Response } from 'express';
import { z } from 'zod';
import { sendSuccess } from '../../../utils/response.js';
import { resolveImageViewUrl } from '../../../lib/cloudinary.service.js';
import { createError } from '../../../utils/index.js';

// ============================================
// POST /api/v1/upload/view-url
// Returns a display URL (Cloudinary assets are public HTTPS; passthrough)
// ============================================

const viewUrlSchema = z.object({
  url: z.string().url('Valid URL is required'),
  expiresIn: z.number().min(60).max(86400).optional().default(3600),
});

export const POST = async (req: Request, res: Response): Promise<void> => {
  const parsed = viewUrlSchema.safeParse(req.body);
  if (!parsed.success) {
    const messages = parsed.error.issues.map((issue: { message: string }) => issue.message).join(', ');
    throw createError.badRequest(`Invalid request: ${messages}`);
  }

  const { url, expiresIn } = parsed.data;

  const viewUrl = await resolveImageViewUrl(url);

  sendSuccess(res, {
    viewUrl,
    expiresIn,
  });
};
