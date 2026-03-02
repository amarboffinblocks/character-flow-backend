import { requireAuth } from '../../middleware/auth.middleware.js';
import type { RequestHandler } from 'express';

// GET /realms - Require auth
// POST /realms - Require auth
const middleware: Record<string, RequestHandler[]> = {
    GET: [requireAuth],
    POST: [requireAuth],
};

export default middleware;
