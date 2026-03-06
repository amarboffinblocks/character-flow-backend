import { requireAuth } from '../../../middleware/auth.middleware.js';
import type { RequestHandler } from 'express';

// POST /lorebooks/import - Require auth
const middleware: Record<string, RequestHandler[]> = {
  POST: [requireAuth],
};

export default middleware;
