import { requireAuth } from '../../../middleware/auth.middleware.js';
import type { RequestHandler } from 'express';

// Apply authentication to profile update endpoint
export default [requireAuth] as RequestHandler[];

