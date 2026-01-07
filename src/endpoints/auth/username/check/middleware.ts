import { redisUsernameCheckRateLimiter } from '../../../../middleware/index.js';

// Apply rate limiting for username checks (30 requests per minute per IP)
export default [redisUsernameCheckRateLimiter];

