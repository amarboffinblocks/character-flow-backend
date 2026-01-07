import type { Request, Response } from 'express';
import { idempotencyStore } from '../../../lib/redis.js';
import { sendSuccess, sendError } from '../../../utils/response.js';
import { HTTP_STATUS, ERROR_CODES } from '../../../core/constants/index.js';
import { requireAdmin } from '../../../middleware/auth.middleware.js';
import { asyncHandler } from '../../../middleware/error.middleware.js';
import { z } from 'zod';

// ============================================
// Admin Idempotency Key Management
// ============================================

const listSchema = z.object({
  limit: z.coerce.number().int().min(1).max(1000).optional().default(100),
});

/**
 * GET /api/v1/admin/idempotency
 * List all idempotency keys
 */
export const GET = asyncHandler(async (req: Request, res: Response) => {
  // Apply admin auth middleware
  await new Promise<void>((resolve, reject) => {
    requireAdmin(req, res, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  const query = listSchema.parse(req.query);
  const keys = await idempotencyStore.list(query.limit);
  
  sendSuccess(res, {
    keys,
    count: keys.length,
  });
});

/**
 * DELETE /api/v1/admin/idempotency
 * Delete all idempotency keys (use with caution!)
 * Query param ?key=<key> to delete specific key
 */
export const DELETE = asyncHandler(async (req: Request, res: Response) => {
  // Apply admin auth middleware
  await new Promise<void>((resolve, reject) => {
    requireAdmin(req, res, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  const { key } = req.query;

  // If specific key provided, delete only that key
  if (key && typeof key === 'string') {
    const deleted = await idempotencyStore.delete(key);
    
    if (deleted) {
      sendSuccess(res, { 
        message: 'Idempotency key deleted successfully', 
        key 
      });
    } else {
      sendError(
        res,
        'Failed to delete idempotency key or key not found',
        ERROR_CODES.NOT_FOUND,
        HTTP_STATUS.NOT_FOUND
      );
    }
    return;
  }

  // Otherwise, delete all keys
  const deletedCount = await idempotencyStore.deleteAll();
  
  sendSuccess(res, {
    message: `Deleted ${deletedCount} idempotency key(s)`,
    deletedCount,
  });
});

