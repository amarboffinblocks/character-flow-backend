import { requireAuth } from '../../../middleware/auth.middleware.js';
import type { RequestHandler } from 'express';

// GET /folders/:id - Require auth
// PUT /folders/:id - Require auth
// DELETE /folders/:id - Require auth
const middleware: Record<string, RequestHandler[]> = {
  GET: [requireAuth],
  PUT: [requireAuth],
  DELETE: [requireAuth],
};

export default middleware;
