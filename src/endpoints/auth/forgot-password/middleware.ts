import { redisAuthRateLimiter } from '../../../middleware/index.js';

// Apply strict rate limiting for password reset requests
export default [redisAuthRateLimiter];

