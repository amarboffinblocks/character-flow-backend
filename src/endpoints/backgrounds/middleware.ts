import { requireAuth } from '../../middleware/auth.middleware.js';
import type { RequestHandler } from 'express';

// All background routes require authentication
const middleware: Record<string, RequestHandler[]> = {
  GET: [requireAuth],
  POST: [requireAuth],
};

export default middleware;
