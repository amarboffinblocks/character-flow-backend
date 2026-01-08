import { requireAuth } from '../../../middleware/auth.middleware.js';

// ============================================
// Batch Delete Lorebooks Middleware
// ============================================

export const middleware = [requireAuth];
