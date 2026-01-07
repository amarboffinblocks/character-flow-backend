import { redisAuthRateLimiter } from '../../../../middleware/index.js';

// Apply strict rate limiting for OTP verification attempts
export default [redisAuthRateLimiter];

