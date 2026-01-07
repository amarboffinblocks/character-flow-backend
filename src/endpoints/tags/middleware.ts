import { requireAuth, optionalAuth } from '../../middleware/auth.middleware.js';
import type { RequestHandler } from 'express';

// GET /tags - Optional auth (public tags)
// POST /tags - Require auth
// PUT/DELETE /tags/:id - Require auth
const middleware: Record<string, RequestHandler[]> = {
  GET: [optionalAuth],
  POST: [requireAuth],
  PUT: [requireAuth],
  DELETE: [requireAuth],
};

export default middleware;

