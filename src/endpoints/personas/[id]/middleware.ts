import { requireAuth, optionalAuth } from '../../../middleware/auth.middleware.js';
import type { RequestHandler } from 'express';

// GET /personas/:id - Optional auth (public personas accessible without auth)
// PUT /personas/:id - Require auth
// DELETE /personas/:id - Require auth
const middleware: Record<string, RequestHandler[]> = {
  GET: [optionalAuth],
  PUT: [requireAuth],
  DELETE: [requireAuth],
};

export default middleware;
