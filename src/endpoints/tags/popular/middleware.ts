import { optionalAuth } from '../../../middleware/auth.middleware.js';
import type { RequestHandler } from 'express';

// GET /tags/popular - Optional auth (public)
const middleware: Record<string, RequestHandler[]> = {
  GET: [optionalAuth],
};

export default middleware;

