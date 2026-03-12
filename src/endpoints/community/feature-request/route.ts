import type { Request, Response } from 'express';
import { sendSuccess, sendError } from '../../../utils/response.js';
import { requireCurrentUser } from '../../../middleware/auth.middleware.js';
import { emailService } from '../../../lib/email.service.js';
import { z } from 'zod';
import { formatZodErrorForResponse } from '../../../utils/errors.js';
import { logger } from '../../../lib/logger.js';
import multer from 'multer';

// Use memory storage for direct streaming to nodemailer
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
}).array('attachments', 5);

// Validation schema for feature request
const featureRequestSchema = z.object({
    title: z.string().min(4, 'Title must be at least 4 characters').max(100),
    priority: z.enum(['low', 'medium', 'high', 'critical']),
    category: z.enum(['ui-ux', 'performance', 'integration', 'functionality', 'other', 'Bug Report']),
    platform: z.enum(['web', 'mobile', 'desktop']),
    operating_system: z.enum(['web', 'mobile', 'desktop', 'api']).optional().or(z.literal('')),
    description: z.string().min(10, 'Description is too short'),
    additional_details: z.string().optional().or(z.literal('')),
});

// ============================================
// POST /api/v1/community/feature-request
// ============================================

export const POST = async (req: Request, res: Response): Promise<void> => {
    return new Promise((resolve) => {
        upload(req, res, async (err) => {
            if (err) {
                sendError(res, err.message, 'VALIDATION_ERROR', 400);
                return resolve();
            }

            try {
                const user = requireCurrentUser(req);

                // Parse req.body manually now that it's extracted by multer
                const data = featureRequestSchema.parse(req.body);

                // Structure multer files for nodemailer
                const attachments = (req.files as Express.Multer.File[] || []).map(file => ({
                    filename: file.originalname,
                    content: file.buffer,
                    contentType: file.mimetype
                }));

                await emailService.sendFeatureRequestEmail({
                    title: data.title,
                    priority: data.priority,
                    category: data.category,
                    platform: data.platform,
                    // Use a clean undefined fallback if it's empty string
                    operatingSystem: data.operating_system || undefined,
                    description: data.description,
                    additionalDetails: data.additional_details || undefined,
                    requesterUsername: user.username,
                    requesterEmail: user.email,
                    attachments
                });

                sendSuccess(res, null, 'Feature request submitted successfully', 201);
            } catch (error: any) {
                if (error instanceof z.ZodError) {
                    const { message, details } = formatZodErrorForResponse(error);
                    sendError(res, message, 'VALIDATION_ERROR', 422, details);
                } else if (error.statusCode) {
                    // Handle errors from requireCurrentUser or other parts of the system
                    sendError(res, error.message, error.errorCode || 'ERROR', error.statusCode);
                } else {
                    logger.error({ err: error }, 'Failed to process feature request');
                    sendError(res, 'Failed to process feature request', 'INTERNAL_SERVER_ERROR', 500);
                }
            } finally {
                resolve();
            }
        });
    });
};
