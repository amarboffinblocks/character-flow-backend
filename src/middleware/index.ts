// Auth middleware
export { 
  requireAuth, 
  optionalAuth, 
  requireAdmin, 
  getCurrentUser, 
  requireCurrentUser 
} from './auth.middleware.js';

// Error handling
export { 
  errorHandler, 
  notFoundHandler, 
  asyncHandler,
  asyncRouteHandler,
} from './error.middleware.js';

// Validation
export { 
  validate, 
  validateBody, 
  validateQuery, 
  validateParams 
} from './validation.middleware.js';

// Redis-based rate limiting (production-ready)
export {
  createRedisRateLimiter,
  redisGeneralRateLimiter,
  redisAuthRateLimiter,
  redisUploadRateLimiter,
  redisSensitiveRateLimiter,
  redisOtpRateLimiter,
  redisUsernameCheckRateLimiter,
  userKeyGenerator,
  endpointKeyGenerator,
  userEndpointKeyGenerator,
} from './redis-rate-limit.middleware.js';

// Idempotency
export {
  idempotencyMiddleware,
  requireIdempotencyKey,
  skipIdempotency,
} from './idempotency.middleware.js';
