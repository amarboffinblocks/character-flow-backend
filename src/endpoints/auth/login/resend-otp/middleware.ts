import { redisAuthRateLimiter } from '../../../../middleware/index.js';

// Apply strict rate limiting for OTP resend requests
export default [redisAuthRateLimiter];

