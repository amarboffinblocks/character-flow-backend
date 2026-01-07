import { optionalAuth } from '../../../../middleware/auth.middleware.js';

// GET /characters/slug/:slug - Optional auth (public characters accessible without auth)
export default {
  GET: [optionalAuth],
};

