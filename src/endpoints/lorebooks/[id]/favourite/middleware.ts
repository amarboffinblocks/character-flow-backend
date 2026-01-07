import { requireAuth } from '../../../../middleware/auth.middleware.js';

// PATCH /lorebooks/:id/favourite - Require auth
export default [requireAuth];

