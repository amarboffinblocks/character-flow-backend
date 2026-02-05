import { requireAdmin } from '../../middleware/auth.middleware.js';
import type { RequestHandler } from 'express';

// GET /models - Public (no auth required)
// POST /models - Require admin
const middleware: Record<string, RequestHandler[]> = {
    // POST: [requireAdmin],
};

export default middleware;
