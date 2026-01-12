import { requireAuth } from '../../../middleware/auth.middleware.js';
import type { RequestHandler } from 'express';

// ============================================
// Import Character Middleware
// ============================================

const middleware: Record<string, RequestHandler[]> = {
    POST: [requireAuth],
};

export default middleware;
