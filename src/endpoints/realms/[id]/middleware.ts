import { requireAuth } from '../../../middleware/auth.middleware.js';
import type { RequestHandler } from 'express';

// GET /realms/:id - Require auth
// PATCH /realms/:id - Require auth
// DELETE /realms/:id - Require auth
const middleware: Record<string, RequestHandler[]> = {
    GET: [requireAuth],
    PATCH: [requireAuth],
    DELETE: [requireAuth],
};

export default middleware;
