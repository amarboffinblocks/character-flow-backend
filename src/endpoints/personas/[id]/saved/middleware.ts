import { requireAuth } from '../../../../middleware/auth.middleware.js';

export default {
  PATCH: [requireAuth],
};
