import { requireAuth } from '../../../../middleware/auth.middleware.js';

// PATCH /characters/:id/favourite - Require auth
export default [requireAuth];

