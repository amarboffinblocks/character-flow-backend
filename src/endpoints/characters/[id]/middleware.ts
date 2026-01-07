import { requireAuth, optionalAuth } from '../../../middleware/auth.middleware.js';
import type { RequestHandler } from 'express';

// GET /characters/:id - Optional auth (public characters accessible without auth)
// PUT /characters/:id - Require auth
// DELETE /characters/:id - Require auth
const middleware: Record<string, RequestHandler[]> = {
  GET: [optionalAuth],
  PUT: [requireAuth],
  DELETE: [requireAuth],
};

export default middleware;

