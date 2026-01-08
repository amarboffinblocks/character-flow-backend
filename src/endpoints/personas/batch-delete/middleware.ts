import { requireAuth } from '../../../middleware/auth.middleware.js';

// ============================================
// Batch Delete Personas Middleware
// ============================================

export const middleware = [requireAuth];
