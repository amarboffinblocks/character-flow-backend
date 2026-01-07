import { requireAuth } from '../../../../middleware/auth.middleware.js';

// GET /lorebooks/:id/entries - Require auth
// POST /lorebooks/:id/entries - Require auth
export default [requireAuth];

