import type { Request, Response, NextFunction } from 'express';
import { idempotencyStore } from '../lib/redis.js';
import { sendError } from '../utils/response.js';
import { logger } from '../lib/logger.js';
import crypto from 'crypto';

// ============================================
// Idempotency Middleware (Production-Ready)
// ============================================

const IDEMPOTENCY_HEADER = 'idempotency-key';
const IDEMPOTENCY_REPLAY_HEADER = 'x-idempotency-replay';
const LOCK_TTL_SECONDS = 60; // Lock expires after 60 seconds
const MAX_IDEMPOTENCY_KEY_LENGTH = 128;

/**
 * Generate hash of request body for idempotency key
 */
const hashRequestBody = (body: unknown): string => {
  if (!body) return '';
  
  try {
    const bodyString = typeof body === 'string' ? body : JSON.stringify(body);
    return crypto.createHash('sha256').update(bodyString).digest('hex').substring(0, 16);
  } catch {
    return '';
  }
};

/**
 * Validate idempotency key format
 */
const validateIdempotencyKey = (key: string): { valid: boolean; error?: string } => {
  if (!key || typeof key !== 'string') {
    return { valid: false, error: 'Idempotency-Key header is required' };
  }

  // Trim whitespace
  const trimmed = key.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: 'Idempotency-Key cannot be empty' };
  }

  // Check length
  if (trimmed.length > MAX_IDEMPOTENCY_KEY_LENGTH) {
    return { 
      valid: false, 
      error: `Idempotency-Key must be at most ${MAX_IDEMPOTENCY_KEY_LENGTH} characters` 
    };
  }

  // Check minimum length (UUID is 36 chars, but allow shorter for flexibility)
  if (trimmed.length < 8) {
    return { 
      valid: false, 
      error: 'Idempotency-Key must be at least 8 characters' 
    };
  }

  // Check for valid characters (alphanumeric, hyphens, underscores)
  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    return { 
      valid: false, 
      error: 'Idempotency-Key can only contain letters, numbers, hyphens, and underscores' 
    };
  }

  return { valid: true };
};

/**
 * Generate cache key for idempotency
 * Format: user:path:method:bodyHash:idempotencyKey
 */
const generateCacheKey = (
  req: Request,
  idempotencyKey: string,
  bodyHash: string
): string => {
  const user = (req as Request & { user?: { id: string } }).user;
  const userId = user?.id || 'anon';
  const path = req.path.replace(/\/api\/v\d+\//, ''); // Remove API version prefix
  const method = req.method.toUpperCase();
  
  return `${userId}:${path}:${method}:${bodyHash}:${idempotencyKey}`;
};

/**
 * Idempotency middleware for POST/PUT/PATCH requests
 * Implements RFC 7231 idempotency key specification
 */
export const idempotencyMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Only apply to mutation methods
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    next();
    return;
  }

  // Check for idempotency key in headers (case-insensitive)
  const getHeaderValue = (headerName: string): string | undefined => {
    const value = req.headers[headerName];
    if (Array.isArray(value)) {
      return value[0];
    }
    return value;
  };

  const idempotencyKeyRaw = 
    getHeaderValue(IDEMPOTENCY_HEADER) || 
    getHeaderValue('Idempotency-Key') ||
    getHeaderValue('IDEMPOTENCY-KEY');

  // If no idempotency key provided, continue without caching
  if (!idempotencyKeyRaw) {
    next();
    return;
  }

  // Validate idempotency key
  const validation = validateIdempotencyKey(idempotencyKeyRaw);
  if (!validation.valid) {
    sendError(
      res,
      validation.error || 'Invalid Idempotency-Key header',
      'INVALID_IDEMPOTENCY_KEY',
      400
    );
    return;
  }

  const idempotencyKey = idempotencyKeyRaw.trim();
  const bodyHash = hashRequestBody(req.body);
  const cacheKey = generateCacheKey(req, idempotencyKey, bodyHash);

  try {
    // Check for existing cached response
    const cachedResponse = await idempotencyStore.get(cacheKey);

    if (cachedResponse) {
      // Return cached response (idempotent replay)
      logger.info({ 
        cacheKey, 
        path: req.path, 
        method: req.method 
      }, 'Idempotent request replay');
      
      res.setHeader(IDEMPOTENCY_REPLAY_HEADER, 'true');
      res.setHeader('X-Idempotency-Key', idempotencyKey);
      res.status(cachedResponse.statusCode).json(cachedResponse.body);
      return;
    }

    // Try to acquire lock for concurrent request handling
    const lockAcquired = await idempotencyStore.lock(cacheKey, LOCK_TTL_SECONDS);

    if (!lockAcquired) {
      // Another request is processing with the same idempotency key
      // Wait a bit and check again (exponential backoff)
      let retries = 0;
      const maxRetries = 5;
      const baseDelay = 100; // 100ms

      while (retries < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, baseDelay * Math.pow(2, retries)));
        
        const retryCachedResponse = await idempotencyStore.get(cacheKey);
        if (retryCachedResponse) {
          // Response is now cached, return it
          res.setHeader(IDEMPOTENCY_REPLAY_HEADER, 'true');
          res.setHeader('X-Idempotency-Key', idempotencyKey);
          res.status(retryCachedResponse.statusCode).json(retryCachedResponse.body);
          return;
        }

        retries++;
      }

      // Still locked after retries - return conflict
      logger.warn({ cacheKey, path: req.path }, 'Idempotency key conflict - request still processing');
      sendError(
        res,
        'A request with this idempotency key is already being processed. Please retry after a moment.',
        'IDEMPOTENCY_CONFLICT',
        409
      );
      return;
    }

    // Lock acquired - proceed with request
    let responseCached = false;
    let lockReleased = false;

    // Helper to release lock safely
    const releaseLock = async (): Promise<void> => {
      if (!lockReleased) {
        lockReleased = true;
        await idempotencyStore.unlock(cacheKey);
      }
    };

    // Helper to cache response safely
    const cacheResponse = async (statusCode: number, body: unknown): Promise<void> => {
      if (!responseCached && statusCode >= 200 && statusCode < 500) {
        // Only cache successful responses (2xx, 3xx, 4xx client errors)
        // Don't cache 5xx server errors as they might be transient
        responseCached = true;
        try {
          await idempotencyStore.set(cacheKey, { statusCode, body });
          logger.debug({ cacheKey, statusCode }, 'Cached idempotent response');
        } catch (error) {
          logger.error({ err: error, cacheKey }, 'Failed to cache idempotent response');
        }
      }
    };

    // Store original response methods
    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);
    const originalStatus = res.status.bind(res);
    const originalEnd = res.end.bind(res);

    // Track status code
    let responseStatusCode = res.statusCode || 200;

    // Override status to track status code
    res.status = function (code: number) {
      responseStatusCode = code;
      return originalStatus(code);
    };

    // Override json method to cache response
    res.json = function (body: unknown) {
      cacheResponse(responseStatusCode, body).finally(() => {
        releaseLock();
      });
      return originalJson(body);
    };

    // Override send method to cache response
    res.send = function (body: unknown) {
      // Only cache JSON-like responses
      if (typeof body === 'object' || typeof body === 'string') {
        try {
          const parsedBody = typeof body === 'string' ? JSON.parse(body) : body;
          cacheResponse(responseStatusCode, parsedBody).finally(() => {
            releaseLock();
          });
        } catch {
          // Not JSON, don't cache but still release lock
          releaseLock();
        }
      } else {
        releaseLock();
      }
      return originalSend(body);
    };

    // Override end method
    res.end = function (chunk?: unknown, encodingOrCb?: BufferEncoding | (() => void), cb?: () => void) {
      releaseLock();
      if (typeof encodingOrCb === 'function') {
        return originalEnd(chunk, encodingOrCb);
      }
      if (encodingOrCb && cb) {
        return originalEnd(chunk, encodingOrCb, cb);
      }
      if (encodingOrCb) {
        return originalEnd(chunk, encodingOrCb);
      }
      return originalEnd(chunk);
    };

    // Handle response finish (for all cases including errors)
    res.on('finish', () => {
      if (!responseCached && responseStatusCode >= 200 && responseStatusCode < 500) {
        // Try to cache if not already cached (for cases where json/send wasn't called)
        const responseBody = (res as unknown as { _body?: unknown })._body;
        if (responseBody !== undefined) {
          cacheResponse(responseStatusCode, responseBody);
        }
      }
      releaseLock();
    });

    // Handle response close/error
    res.on('close', () => {
      releaseLock();
    });

    // Set idempotency key header in response
    res.setHeader('X-Idempotency-Key', idempotencyKey);

    next();
  } catch (error) {
    // On error, release lock and continue (fail open)
    logger.error({ err: error, cacheKey, path: req.path }, 'Idempotency middleware error');
    await idempotencyStore.unlock(cacheKey);
    next();
  }
};

/**
 * Require idempotency key middleware
 * Use for endpoints that MUST have idempotency protection
 */
export const requireIdempotencyKey = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    next();
    return;
  }

  const getHeaderValue = (headerName: string): string | undefined => {
    const value = req.headers[headerName];
    if (Array.isArray(value)) {
      return value[0];
    }
    return value;
  };

  const idempotencyKeyRaw = 
    getHeaderValue(IDEMPOTENCY_HEADER) || 
    getHeaderValue('Idempotency-Key') ||
    getHeaderValue('IDEMPOTENCY-KEY');

  if (!idempotencyKeyRaw) {
    sendError(
      res,
      'Idempotency-Key header is required for this endpoint',
      'IDEMPOTENCY_KEY_REQUIRED',
      400
    );
    return;
  }

  const validation = validateIdempotencyKey(idempotencyKeyRaw);
  if (!validation.valid) {
    sendError(
      res,
      validation.error || 'Invalid Idempotency-Key header',
      'INVALID_IDEMPOTENCY_KEY',
      400
    );
    return;
  }

  next();
};

/**
 * Skip idempotency middleware (for endpoints that shouldn't use idempotency)
 * Use this in route-specific middleware to bypass idempotency
 */
export const skipIdempotency = (
  _req: Request,
  _res: Response,
  next: NextFunction
): void => {
  // This is a no-op middleware that can be used to mark routes
  // that should skip idempotency (though the main middleware already
  // only applies to POST/PUT/PATCH/DELETE)
  next();
};

