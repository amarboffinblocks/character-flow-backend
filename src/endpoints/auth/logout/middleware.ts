import { requireAuth } from '../../../middleware/auth.middleware.js';

// Middleware for logout endpoint - requires authentication
export default [requireAuth];

