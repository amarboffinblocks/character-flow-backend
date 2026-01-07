import { requireAuth } from '../../../../middleware/auth.middleware.js';

// PATCH /characters/:id/saved - Require auth
export default [requireAuth];

