import { requireAuth, optionalAuth } from '../../../middleware/auth.middleware.js';
import type { RequestHandler } from 'express';

// GET /lorebooks/:id - Optional auth (public lorebooks accessible without auth)
// PUT /lorebooks/:id - Require auth
// DELETE /lorebooks/:id - Require auth
const middleware: Record<string, RequestHandler[]> = {
  GET: [optionalAuth],
  PUT: [requireAuth],
  DELETE: [requireAuth],
};

export default middleware;

