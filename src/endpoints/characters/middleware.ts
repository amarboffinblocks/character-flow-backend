import { requireAuth, optionalAuth } from '../../middleware/auth.middleware.js';
import type { RequestHandler } from 'express';

// GET /characters - Optional auth (public characters if not authenticated)
// POST /characters - Require auth
const middleware: Record<string, RequestHandler[]> = {
  GET: [optionalAuth],
  POST: [requireAuth],
};

export default middleware;

