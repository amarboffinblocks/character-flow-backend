import { requireAuth } from '../../../middleware/auth.middleware.js';
import type { RequestHandler } from 'express';

// ============================================
// Batch Delete Characters Middleware
// ============================================

const middleware: Record<string, RequestHandler[]> = {
  POST: [requireAuth],
};

export default middleware;

