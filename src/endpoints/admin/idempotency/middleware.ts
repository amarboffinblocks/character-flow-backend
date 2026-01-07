import { requireAdmin } from '../../../middleware/auth.middleware.js';
import type { RequestHandler } from 'express';

// Apply admin authentication to all idempotency management endpoints
export default [requireAdmin] as RequestHandler[];

