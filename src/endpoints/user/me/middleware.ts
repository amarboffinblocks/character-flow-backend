import { requireAuth } from '../../../middleware/auth.middleware.js';

// Middleware for user/me endpoint - requires authentication
export default [requireAuth];

