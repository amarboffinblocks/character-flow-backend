import { requireAuth, optionalAuth } from '../../middleware/auth.middleware.js';
import type { RequestHandler } from 'express';

// GET /lorebooks - Optional auth (public lorebooks if not authenticated)
// POST /lorebooks - Require auth
const middleware: Record<string, RequestHandler[]> = {
  GET: [optionalAuth],
  POST: [requireAuth],
};

export default middleware;

