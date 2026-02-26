import { requireAuth } from '../../../middleware/auth.middleware.js';
import type { RequestHandler } from 'express';

// All background :id routes require authentication
const middleware: Record<string, RequestHandler[]> = {
  GET: [requireAuth],
  PUT: [requireAuth],
  DELETE: [requireAuth],
};

export default middleware;
