import { requireAuth } from '../../../middleware/auth.middleware.js';
import type { RequestHandler } from 'express';

const middleware: Record<string, RequestHandler[]> = {
  GET: [requireAuth],
  PATCH: [requireAuth],
  DELETE: [requireAuth],
};

export default middleware;
