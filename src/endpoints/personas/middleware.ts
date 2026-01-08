import { requireAuth, optionalAuth } from '../../middleware/auth.middleware.js';
import type { RequestHandler } from 'express';

// GET /personas - Optional auth (public personas if not authenticated)
// POST /personas - Require auth
const middleware: Record<string, RequestHandler[]> = {
  GET: [optionalAuth],
  POST: [requireAuth],
};

export default middleware;
