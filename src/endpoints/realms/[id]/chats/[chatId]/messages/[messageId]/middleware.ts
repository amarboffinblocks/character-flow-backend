import { requireAuth } from '../../../../../../../middleware/auth.middleware.js';
import type { RequestHandler } from 'express';

const middleware: Record<string, RequestHandler[]> = {
  DELETE: [requireAuth],
};

export default middleware;
