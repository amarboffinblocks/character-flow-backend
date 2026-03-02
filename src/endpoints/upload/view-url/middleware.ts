import { requireAuth } from '../../../middleware/auth.middleware.js';
import type { RequestHandler } from 'express';

// POST /upload/view-url - Require auth
const middleware: Record<string, RequestHandler[]> = {
  POST: [requireAuth],
};

export default middleware;
