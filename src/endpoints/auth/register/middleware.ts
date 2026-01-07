import { redisAuthRateLimiter } from '../../../middleware/index.js';

// Apply strict rate limiting for registration attempts
export default [redisAuthRateLimiter];

