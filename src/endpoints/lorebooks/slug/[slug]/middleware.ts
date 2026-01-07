import { optionalAuth } from '../../../../middleware/auth.middleware.js';

// GET /lorebooks/slug/:slug - Optional auth (public lorebooks accessible without auth)
export default {
  GET: [optionalAuth],
};

