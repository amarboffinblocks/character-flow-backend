import { requireAuth } from '../../middleware/auth.middleware.js';
import type { RequestHandler } from 'express';

// GET /folders - Require auth
// POST /folders - Require auth
const middleware: Record<string, RequestHandler[]> = {
  GET: [requireAuth],
  POST: [requireAuth],
};

export default middleware;
