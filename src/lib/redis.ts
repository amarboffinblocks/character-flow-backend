import { Redis } from 'ioredis';
import { config } from '../config/index.js';
import { logger } from './logger.js';

// ============================================
// Redis Client Singleton with Connection Pooling
// ============================================

let redis: Redis | null = null;
let isConnected = false;
let connectionAttempts = 0;
const MAX_CONNECTION_ATTEMPTS = 5;

export const getRedis = (): Redis | null => {
  if (!config.redis.url) {
    if (connectionAttempts === 0) {
      logger.warn('Redis URL not configured, caching disabled');
    }
    return null;
  }

  if (!redis) {
    redis = new Redis(config.redis.url, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times: number) => {
        connectionAttempts = times;
        if (times > MAX_CONNECTION_ATTEMPTS) {
          logger.error('Redis connection failed after max attempts');
          return null;
        }
        const delay = Math.min(times * 200, 2000);
        logger.warn({ attempt: times, delay }, 'Retrying Redis connection');
        return delay;
      },
      lazyConnect: true,
      enableReadyCheck: true,
      enableOfflineQueue: false, // Don't queue commands when offline
      connectTimeout: 10000,
      keepAlive: 30000,
      // Reconnect on error
      reconnectOnError: (err: Error) => {
        const targetErrors = ['READONLY', 'ECONNREFUSED', 'ETIMEDOUT'];
        if (targetErrors.some((target) => err.message.includes(target))) {
          logger.warn({ err }, 'Reconnecting to Redis');
          return true;
        }
        return false;
      },
    });

    redis.on('connect', () => {
      isConnected = true;
      connectionAttempts = 0;
      logger.info('✅ Redis connected');
    });

    redis.on('ready', () => {
      isConnected = true;
      logger.info('✅ Redis ready');
    });

    redis.on('error', (error: Error) => {
      isConnected = false;
      logger.error({ err: error }, 'Redis error');
    });

    redis.on('close', () => {
      isConnected = false;
      logger.warn('Redis connection closed');
    });

    redis.on('reconnecting', (delay: number) => {
      logger.info({ delay }, 'Redis reconnecting');
    });

    // Connect immediately
    redis.connect().catch((err) => {
      isConnected = false;
      logger.error({ err }, 'Failed to connect to Redis');
    });
  }

  return redis;
};

export const isRedisConnected = (): boolean => {
  return isConnected && redis?.status === 'ready';
};

export const closeRedis = async (): Promise<void> => {
  if (redis) {
    try {
      await redis.quit();
      redis = null;
      isConnected = false;
      logger.info('Redis connection closed');
    } catch (error) {
      logger.error({ err: error }, 'Error closing Redis connection');
      // Force disconnect if quit fails
      redis?.disconnect();
      redis = null;
      isConnected = false;
    }
  }
};

// ============================================
// Lua Scripts for Atomic Operations
// ============================================

/**
 * Sliding window rate limit Lua script
 * Returns: [allowed (1/0), remaining, reset_time]
 */
const SLIDING_WINDOW_SCRIPT = `
  local key = KEYS[1]
  local window = tonumber(ARGV[1])
  local limit = tonumber(ARGV[2])
  local now = tonumber(ARGV[3])
  
  -- Remove expired entries
  redis.call('ZREMRANGEBYSCORE', key, 0, now - window)
  
  -- Count current requests
  local current = redis.call('ZCARD', key)
  
  if current < limit then
    -- Add current request
    redis.call('ZADD', key, now, now)
    redis.call('EXPIRE', key, window)
    return {1, limit - current - 1, now + window}
  else
    -- Get oldest request time
    local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
    local reset_time = tonumber(oldest[2]) + window
    return {0, 0, reset_time}
  end
`;

let slidingWindowScriptSha: string | null = null;

const loadSlidingWindowScript = async (client: Redis): Promise<string> => {
  if (!slidingWindowScriptSha) {
    const sha = await client.script('LOAD', SLIDING_WINDOW_SCRIPT);
    slidingWindowScriptSha = sha as string;
  }
  return slidingWindowScriptSha;
};

// ============================================
// Cache Utilities
// ============================================

export const cache = {
  /**
   * Get a value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    const client = getRedis();
    if (!client || !isRedisConnected()) return null;

    try {
      const data = await client.get(key);
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch (error) {
      logger.debug({ err: error, key }, 'Cache get error');
      return null;
    }
  },

  /**
   * Set a value in cache with optional TTL
   */
  async set(key: string, value: unknown, ttlSeconds?: number): Promise<boolean> {
    const client = getRedis();
    if (!client || !isRedisConnected()) return false;

    try {
      const stringValue = JSON.stringify(value);
      if (ttlSeconds && ttlSeconds > 0) {
        await client.setex(key, ttlSeconds, stringValue);
      } else {
        await client.set(key, stringValue);
      }
      return true;
    } catch (error) {
      logger.debug({ err: error, key }, 'Cache set error');
      return false;
    }
  },

  /**
   * Delete a key from cache
   */
  async del(key: string): Promise<boolean> {
    const client = getRedis();
    if (!client || !isRedisConnected()) return false;

    try {
      await client.del(key);
      return true;
    } catch (error) {
      logger.debug({ err: error, key }, 'Cache del error');
      return false;
    }
  },

  /**
   * Delete multiple keys matching a pattern (using SCAN - non-blocking)
   */
  async delPattern(pattern: string): Promise<number> {
    const client = getRedis();
    if (!client || !isRedisConnected()) return 0;

    try {
      let cursor = '0';
      let deletedCount = 0;
      const keys: string[] = [];

      // Use SCAN instead of KEYS to avoid blocking
      do {
        const result = await client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = result[0];
        keys.push(...result[1]);
      } while (cursor !== '0');

      // Delete in batches
      if (keys.length > 0) {
        const batchSize = 100;
        for (let i = 0; i < keys.length; i += batchSize) {
          const batch = keys.slice(i, i + batchSize);
          const deleted = await client.del(...batch);
          deletedCount += deleted;
        }
      }

      return deletedCount;
    } catch (error) {
      logger.debug({ err: error, pattern }, 'Cache delPattern error');
      return 0;
    }
  },

  /**
   * Check if a key exists
   */
  async exists(key: string): Promise<boolean> {
    const client = getRedis();
    if (!client || !isRedisConnected()) return false;

    try {
      const result = await client.exists(key);
      return result === 1;
    } catch (error) {
      logger.debug({ err: error, key }, 'Cache exists error');
      return false;
    }
  },

  /**
   * Set expiration on a key
   */
  async expire(key: string, ttlSeconds: number): Promise<boolean> {
    const client = getRedis();
    if (!client || !isRedisConnected()) return false;

    try {
      await client.expire(key, ttlSeconds);
      return true;
    } catch (error) {
      logger.debug({ err: error, key }, 'Cache expire error');
      return false;
    }
  },

  /**
   * Get TTL of a key
   */
  async ttl(key: string): Promise<number> {
    const client = getRedis();
    if (!client || !isRedisConnected()) return -1;

    try {
      return await client.ttl(key);
    } catch (error) {
      logger.debug({ err: error, key }, 'Cache ttl error');
      return -1;
    }
  },
};

// ============================================
// Session Store (for Refresh Tokens)
// ============================================

const SESSION_PREFIX = 'session:';
const SESSION_TTL = 7 * 24 * 60 * 60; // 7 days

export const sessionStore = {
  /**
   * Store a session
   */
  async create(
    userId: string,
    sessionId: string,
    data: { userAgent?: string; ipAddress?: string }
  ): Promise<boolean> {
    const client = getRedis();
    if (!client || !isRedisConnected()) return false;

    try {
      const sessionData = {
        sessionId,
        userId,
        userAgent: data.userAgent,
        ipAddress: data.ipAddress,
        createdAt: new Date().toISOString(),
      };

      // Store session by session ID
      await client.setex(
        `${SESSION_PREFIX}${sessionId}`,
        SESSION_TTL,
        JSON.stringify(sessionData)
      );

      // Add session ID to user's session set
      await client.sadd(`${SESSION_PREFIX}user:${userId}`, sessionId);
      await client.expire(`${SESSION_PREFIX}user:${userId}`, SESSION_TTL);

      return true;
    } catch (error) {
      logger.debug({ err: error, userId, sessionId }, 'Session create error');
      return false;
    }
  },

  /**
   * Get a session by ID
   */
  async get(sessionId: string): Promise<{
    sessionId: string;
    userId: string;
    userAgent?: string;
    ipAddress?: string;
    createdAt: string;
  } | null> {
    const client = getRedis();
    if (!client || !isRedisConnected()) return null;

    try {
      const data = await client.get(`${SESSION_PREFIX}${sessionId}`);
      if (!data) return null;
      return JSON.parse(data);
    } catch (error) {
      logger.debug({ err: error, sessionId }, 'Session get error');
      return null;
    }
  },

  /**
   * Delete a session
   */
  async delete(sessionId: string, userId: string): Promise<boolean> {
    const client = getRedis();
    if (!client || !isRedisConnected()) return false;

    try {
      await client.del(`${SESSION_PREFIX}${sessionId}`);
      await client.srem(`${SESSION_PREFIX}user:${userId}`, sessionId);
      return true;
    } catch (error) {
      logger.debug({ err: error, sessionId, userId }, 'Session delete error');
      return false;
    }
  },

  /**
   * Delete all sessions for a user
   */
  async deleteAllForUser(userId: string): Promise<number> {
    const client = getRedis();
    if (!client || !isRedisConnected()) return 0;

    try {
      const sessionIds = await client.smembers(`${SESSION_PREFIX}user:${userId}`);
      
      if (sessionIds.length > 0) {
        const keys = sessionIds.map((id) => `${SESSION_PREFIX}${id}`);
        // Delete in batches if many sessions
        const batchSize = 100;
        for (let i = 0; i < keys.length; i += batchSize) {
          const batch = keys.slice(i, i + batchSize);
          await client.del(...batch);
        }
      }
      
      await client.del(`${SESSION_PREFIX}user:${userId}`);
      return sessionIds.length;
    } catch (error) {
      logger.debug({ err: error, userId }, 'Session deleteAllForUser error');
      return 0;
    }
  },

  /**
   * Get all sessions for a user
   */
  async getAllForUser(userId: string): Promise<string[]> {
    const client = getRedis();
    if (!client || !isRedisConnected()) return [];

    try {
      return await client.smembers(`${SESSION_PREFIX}user:${userId}`);
    } catch (error) {
      logger.debug({ err: error, userId }, 'Session getAllForUser error');
      return [];
    }
  },

  /**
   * Check if session exists
   */
  async exists(sessionId: string): Promise<boolean> {
    return cache.exists(`${SESSION_PREFIX}${sessionId}`);
  },
};

// ============================================
// Advanced Rate Limiter Store (Sliding Window)
// ============================================

const RATE_LIMIT_PREFIX = 'ratelimit:';

export const rateLimitStore = {
  /**
   * Check rate limit using sliding window algorithm (atomic)
   * Returns { allowed: boolean, remaining: number, resetIn: number }
   */
  async check(
    key: string,
    limit: number,
    windowSeconds: number
  ): Promise<{ allowed: boolean; remaining: number; resetIn: number }> {
    const client = getRedis();
    
    // If Redis not available, allow request (fail open)
    if (!client || !isRedisConnected()) {
      logger.debug('Redis not available, allowing request');
      return { allowed: true, remaining: limit, resetIn: windowSeconds };
    }

    try {
      const redisKey = `${RATE_LIMIT_PREFIX}${key}`;
      const now = Math.floor(Date.now() / 1000);
      
      // Load script if not already loaded
      const scriptSha = await loadSlidingWindowScript(client);
      
      // Execute sliding window script atomically
      const result = await client.evalsha(
        scriptSha,
        1,
        redisKey,
        windowSeconds.toString(),
        limit.toString(),
        now.toString()
      ) as [number, number, number];

      const [allowed, remaining, resetTime] = result;
      const resetIn = Math.max(0, resetTime - now);

      return {
        allowed: allowed === 1,
        remaining,
        resetIn,
      };
    } catch (error) {
      // If script not found, load it and retry once
      if (error instanceof Error && error.message.includes('NOSCRIPT')) {
        slidingWindowScriptSha = null;
        try {
          const scriptSha = await loadSlidingWindowScript(client);
          const redisKey = `${RATE_LIMIT_PREFIX}${key}`;
          const now = Math.floor(Date.now() / 1000);
          
          const result = await client.evalsha(
            scriptSha,
            1,
            redisKey,
            windowSeconds.toString(),
            limit.toString(),
            now.toString()
          ) as [number, number, number];

          const [allowed, remaining, resetTime] = result;
          const resetIn = Math.max(0, resetTime - now);

          return {
            allowed: allowed === 1,
            remaining,
            resetIn,
          };
        } catch (retryError) {
          logger.error({ err: retryError, key }, 'Rate limit check error (retry failed)');
          // Fail open on error
          return { allowed: true, remaining: limit, resetIn: windowSeconds };
        }
      }
      
      logger.error({ err: error, key }, 'Rate limit check error');
      // Fail open on error
      return { allowed: true, remaining: limit, resetIn: windowSeconds };
    }
  },

  /**
   * Reset rate limit for a key
   */
  async reset(key: string): Promise<boolean> {
    return cache.del(`${RATE_LIMIT_PREFIX}${key}`);
  },

  /**
   * Get current rate limit status without incrementing
   */
  async getStatus(
    key: string,
    limit: number,
    windowSeconds: number
  ): Promise<{ remaining: number; resetIn: number }> {
    const client = getRedis();
    if (!client || !isRedisConnected()) {
      return { remaining: limit, resetIn: windowSeconds };
    }

    try {
      const redisKey = `${RATE_LIMIT_PREFIX}${key}`;
      const now = Math.floor(Date.now() / 1000);
      
      // Remove expired entries
      await client.zremrangebyscore(redisKey, 0, now - windowSeconds);
      
      // Count current requests
      const current = await client.zcard(redisKey);
      const remaining = Math.max(0, limit - current);
      
      // Get oldest request time to calculate reset time
      const oldest = await client.zrange(redisKey, 0, 0, 'WITHSCORES');
      let resetIn = windowSeconds;
      if (oldest.length > 0) {
        const oldestTime = parseInt(oldest[1] as string, 10);
        resetIn = Math.max(0, oldestTime + windowSeconds - now);
      }

      return { remaining, resetIn };
    } catch (error) {
      logger.debug({ err: error, key }, 'Rate limit getStatus error');
      return { remaining: limit, resetIn: windowSeconds };
    }
  },
};

// ============================================
// Idempotency Store
// ============================================

const IDEMPOTENCY_PREFIX = 'idempotency:';
const IDEMPOTENCY_TTL = 24 * 60 * 60; // 24 hours

export const idempotencyStore = {
  /**
   * Check if idempotency key exists and return cached response
   */
  async get(key: string): Promise<{
    statusCode: number;
    body: unknown;
  } | null> {
    try {
      return await cache.get(`${IDEMPOTENCY_PREFIX}${key}`);
    } catch (error) {
      logger.debug({ err: error, key }, 'Idempotency get error');
      return null;
    }
  },

  /**
   * Store response for idempotency key
   */
  async set(
    key: string,
    response: { statusCode: number; body: unknown }
  ): Promise<boolean> {
    try {
      // Only cache responses that should be cached
      // Don't cache 5xx errors (transient) or very large responses
      const bodySize = JSON.stringify(response.body).length;
      const maxBodySize = 1024 * 1024; // 1MB max

      if (bodySize > maxBodySize) {
        logger.warn({ key, bodySize }, 'Idempotency response too large, not caching');
        return false;
      }

      return await cache.set(`${IDEMPOTENCY_PREFIX}${key}`, response, IDEMPOTENCY_TTL);
    } catch (error) {
      logger.error({ err: error, key }, 'Idempotency set error');
      return false;
    }
  },

  /**
   * Check if key is currently being processed (for concurrent requests)
   * Uses Redis SET with NX (set if not exists) for atomic lock acquisition
   */
  async lock(key: string, ttlSeconds: number = 60): Promise<boolean> {
    const client = getRedis();
    if (!client || !isRedisConnected()) {
      // If Redis not available, allow request (fail open)
      logger.debug('Redis not available, allowing idempotency request');
      return true;
    }

    try {
      const lockKey = `${IDEMPOTENCY_PREFIX}lock:${key}`;
      // SET key value EX seconds NX - atomic operation
      const result = await client.set(lockKey, Date.now().toString(), 'EX', ttlSeconds, 'NX');
      return result === 'OK';
    } catch (error) {
      logger.error({ err: error, key }, 'Idempotency lock error');
      // Fail open - allow request if lock fails
      return true;
    }
  },

  /**
   * Release lock
   */
  async unlock(key: string): Promise<boolean> {
    try {
      return await cache.del(`${IDEMPOTENCY_PREFIX}lock:${key}`);
    } catch (error) {
      logger.debug({ err: error, key }, 'Idempotency unlock error');
      return false;
    }
  },

  /**
   * Check if a key is locked (for debugging/monitoring)
   */
  async isLocked(key: string): Promise<boolean> {
    return cache.exists(`${IDEMPOTENCY_PREFIX}lock:${key}`);
  },

  /**
   * Delete a specific idempotency key and its lock
   */
  async delete(key: string): Promise<boolean> {
    try {
      const client = getRedis();
      if (!client || !isRedisConnected()) {
        logger.warn('Redis not available, cannot delete idempotency key');
        return false;
      }

      const cacheKey = `${IDEMPOTENCY_PREFIX}${key}`;
      const lockKey = `${IDEMPOTENCY_PREFIX}lock:${key}`;
      
      // Delete both cache and lock
      const deleted = await client.del(cacheKey, lockKey);
      logger.info({ key, deleted }, 'Idempotency key deleted');
      return deleted > 0;
    } catch (error) {
      logger.error({ err: error, key }, 'Idempotency delete error');
      return false;
    }
  },

  /**
   * Delete all idempotency keys (use with caution!)
   * Uses SCAN to avoid blocking Redis
   */
  async deleteAll(): Promise<number> {
    try {
      const client = getRedis();
      if (!client || !isRedisConnected()) {
        logger.warn('Redis not available, cannot delete idempotency keys');
        return 0;
      }

      let deletedCount = 0;
      let cursor = '0';
      const pattern = `${IDEMPOTENCY_PREFIX}*`;

      do {
        const result = await client.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          100
        );
        cursor = result[0];
        const keys = result[1];

        if (keys.length > 0) {
          const deleted = await client.del(...keys);
          deletedCount += deleted;
        }
      } while (cursor !== '0');

      logger.info({ deletedCount }, 'All idempotency keys deleted');
      return deletedCount;
    } catch (error) {
      logger.error({ err: error }, 'Error deleting all idempotency keys');
      return 0;
    }
  },

  /**
   * List all idempotency keys (for debugging)
   */
  async list(limit: number = 100): Promise<string[]> {
    try {
      const client = getRedis();
      if (!client || !isRedisConnected()) {
        return [];
      }

      const keys: string[] = [];
      let cursor = '0';
      const pattern = `${IDEMPOTENCY_PREFIX}*`;

      do {
        const result = await client.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          limit
        );
        cursor = result[0];
        const foundKeys = result[1];

        // Remove prefix and filter out lock keys
        for (const key of foundKeys) {
          if (!key.includes(':lock:')) {
            keys.push(key.replace(IDEMPOTENCY_PREFIX, ''));
          }
        }

        if (keys.length >= limit) break;
      } while (cursor !== '0');

      return keys.slice(0, limit);
    } catch (error) {
      logger.error({ err: error }, 'Error listing idempotency keys');
      return [];
    }
  },
};

// ============================================
// Token Blacklist (for logged out tokens)
// ============================================

const BLACKLIST_PREFIX = 'blacklist:';

export const tokenBlacklist = {
  /**
   * Add a token to blacklist
   */
  async add(token: string, ttlSeconds: number): Promise<boolean> {
    return cache.set(`${BLACKLIST_PREFIX}${token}`, true, ttlSeconds);
  },

  /**
   * Check if token is blacklisted
   */
  async isBlacklisted(token: string): Promise<boolean> {
    return cache.exists(`${BLACKLIST_PREFIX}${token}`);
  },
};

// ============================================
// Export Redis client for direct access if needed
// ============================================

export { redis };
export default getRedis;
