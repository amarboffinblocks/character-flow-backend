import { redisAuthRateLimiter } from '../../../middleware/index.js';

// Apply strict rate limiting for login attempts
export default [redisAuthRateLimiter];

