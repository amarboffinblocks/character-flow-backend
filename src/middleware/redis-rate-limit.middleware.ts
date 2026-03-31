import type { Request, Response, NextFunction } from 'express';
import { rateLimitStore } from '../lib/redis.js';
import { sendError } from '../utils/response.js';
import { config } from '../config/index.js';
import { logger } from '../lib/logger.js';

// ============================================
// Redis-Based Rate Limiter Middleware (Production-Ready)
// ============================================

interface RateLimitOptions {
  windowMs?: number;
  max: number;
  keyGenerator?: (req: Request) => string;
  message?: string;
  skipFailedRequests?: boolean;
  skipSuccessfulRequests?: boolean;
  onLimitReached?: (req: Request, res: Response) => void;
  storeTimeoutMs?: number;
}

/**
 * Creates a Redis-based rate limiter middleware with sliding window algorithm
 */
export const createRedisRateLimiter = (options: RateLimitOptions) => {
  const {
    windowMs = config.rateLimit.windowMs,
    max,
    keyGenerator = defaultKeyGenerator,
    message = 'Too many requests, please try again later',
    onLimitReached,
    storeTimeoutMs = 1200,
  } = options;

  const windowSeconds = Math.ceil(windowMs / 1000);

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Never block CORS preflight on Redis round-trips
    if (req.method === 'OPTIONS') {
      next();
      return;
    }

    try {
      const key = keyGenerator(req);
      const result = await Promise.race<{ allowed: boolean; remaining: number; resetIn: number }>([
        rateLimitStore.check(key, max, windowSeconds),
        new Promise<{ allowed: boolean; remaining: number; resetIn: number }>((_, reject) => {
          setTimeout(() => reject(new Error(`Rate limit store timeout after ${storeTimeoutMs}ms`)), storeTimeoutMs);
        }),
      ]);

      // Set rate limit headers (RFC 6585)
      res.setHeader('X-RateLimit-Limit', max.toString());
      res.setHeader('X-RateLimit-Remaining', result.remaining.toString());
      res.setHeader('X-RateLimit-Reset', (Math.floor(Date.now() / 1000) + result.resetIn).toString());

      if (!result.allowed) {
        res.setHeader('Retry-After', result.resetIn.toString());

        // Log rate limit violation
        logger.warn({
          ip: req.ip,
          path: req.path,
          method: req.method,
          key,
          limit: max,
          windowMs,
        }, 'Rate limit exceeded');

        // Call custom handler if provided
        if (onLimitReached) {
          onLimitReached(req, res);
          return;
        }

        sendError(res, message, 'TOO_MANY_REQUESTS', 429);
        return;
      }

      next();
    } catch (error) {
      // Fail open - allow request if Redis fails (but log it)
      logger.error({ err: error, path: req.path }, 'Rate limiter error, allowing request');
      next();
    }
  };
};

/**
 * Default key generator using IP address
 */
const defaultKeyGenerator = (req: Request): string => {
  // Trust proxy headers in production
  const ip = req.ip ||
    req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() ||
    req.headers['x-real-ip']?.toString() ||
    req.socket.remoteAddress ||
    'unknown';
  return `ip:${ip}`;
};

/**
 * Key generator for authenticated users
 */
export const userKeyGenerator = (req: Request): string => {
  const user = (req as Request & { user?: { id: string } }).user;
  if (user?.id) {
    return `user:${user.id}`;
  }
  return defaultKeyGenerator(req);
};

/**
 * Key generator combining IP and endpoint
 */
export const endpointKeyGenerator = (req: Request): string => {
  const ip = defaultKeyGenerator(req);
  const path = req.path.replace(/\/api\/v\d+\//, ''); // Remove API version prefix
  return `${ip}:${req.method}:${path}`;
};

/**
 * Key generator for user-specific endpoints
 */
export const userEndpointKeyGenerator = (req: Request): string => {
  const user = (req as Request & { user?: { id: string } }).user;
  const path = req.path.replace(/\/api\/v\d+\//, '');

  if (user?.id) {
    return `user:${user.id}:${req.method}:${path}`;
  }

  return endpointKeyGenerator(req);
};

// ============================================
// Pre-configured Rate Limiters
// ============================================

/**
 * General API rate limiter (100 requests per minute)
 */
export const redisGeneralRateLimiter = createRedisRateLimiter({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: 'Too many requests, please try again later',
});

/**
 * Auth endpoints rate limiter (5 requests per minute per endpoint)
 */
export const redisAuthRateLimiter = createRedisRateLimiter({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.authMaxRequests,
  keyGenerator: endpointKeyGenerator,
  message: 'Too many authentication attempts, please try again later',
});

/**
 * Upload rate limiter (10 requests per minute)
 */
export const redisUploadRateLimiter = createRedisRateLimiter({
  windowMs: config.rateLimit.windowMs,
  max: 10,
  keyGenerator: userKeyGenerator,
  message: 'Too many upload requests, please try again later',
});

/**
 * Sensitive operations rate limiter (3 requests per minute)
 * For password changes, account deletion, etc.
 */
export const redisSensitiveRateLimiter = createRedisRateLimiter({
  windowMs: 60000, // 1 minute
  max: 3,
  keyGenerator: userKeyGenerator,
  message: 'Too many attempts, please try again later',
});

/**
 * OTP rate limiter (5 requests per hour per user)
 */
export const redisOtpRateLimiter = createRedisRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  keyGenerator: userKeyGenerator,
  message: 'Too many OTP requests, please try again later',
});

/**
 * Username check rate limiter (30 requests per minute)
 */
export const redisUsernameCheckRateLimiter = createRedisRateLimiter({
  windowMs: config.rateLimit.windowMs,
  max: 30,
  message: 'Too many username checks, please try again later',
});
