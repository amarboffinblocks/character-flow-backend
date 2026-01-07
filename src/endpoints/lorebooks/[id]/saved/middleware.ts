import { requireAuth } from '../../../../middleware/auth.middleware.js';

// PATCH /lorebooks/:id/saved - Require auth
export default [requireAuth];

