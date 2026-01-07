import { requireAuth } from '../../../../../middleware/auth.middleware.js';

// PUT /lorebooks/:id/entries/:entryId - Require auth
// DELETE /lorebooks/:id/entries/:entryId - Require auth
export default [requireAuth];

