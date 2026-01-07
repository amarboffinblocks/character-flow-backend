import { authRepository } from './auth.repository.js';
import { cache } from '../../lib/redis.js';
import { createError } from '../../utils/index.js';
import { logger } from '../../lib/logger.js';

// ============================================
// Username Service
// ============================================

const USERNAME_CACHE_TTL = 60 * 60; // 1 hour cache
const USERNAME_CHECK_PREFIX = 'username_check:';

export const usernameService = {
  // ============================================
  // Check Username Availability
  // ============================================

  async checkAvailability(username: string): Promise<{
    available: boolean;
    username: string;
    suggestions?: string[];
  }> {
    // Normalize username
    const normalizedUsername = username.toLowerCase().trim();

    if (!normalizedUsername) {
      throw createError.badRequest('Username is required');
    }

    // Check cache first
    const cacheKey = `${USERNAME_CHECK_PREFIX}${normalizedUsername}`;
    const cached = await cache.get<{ available: boolean }>(cacheKey);

    if (cached !== null) {
      logger.debug({ username: normalizedUsername }, 'Username check from cache');
      // Always generate suggestions if username is not available (even from cache)
      const suggestions = !cached.available 
        ? this.generateSuggestions(normalizedUsername)
        : undefined;
      
      return {
        available: cached.available,
        username: normalizedUsername,
        suggestions,
      };
    }

    // Check database
    const existingUser = await authRepository.findUserByUsername(normalizedUsername);

    const available = !existingUser;

    // Cache the result (cache both available and unavailable)
    await cache.set(cacheKey, { available }, USERNAME_CACHE_TTL);

    // Generate suggestions if username is taken
    let suggestions: string[] | undefined;
    if (!available) {
      suggestions = this.generateSuggestions(normalizedUsername);
    }

    logger.debug({ username: normalizedUsername, available }, 'Username availability checked');

    return {
      available,
      username: normalizedUsername,
      suggestions,
    };
  },

  // ============================================
  // Generate Username Suggestions
  // ============================================

  generateSuggestions(baseUsername: string): string[] {
    const suggestions: string[] = [];
    const randomSuffixes = ['123', '2024', '2025', 'user', 'new', 'pro', 'ai'];
    const randomNum1 = Math.floor(Math.random() * 1000);
    const randomNum2 = Math.floor(Math.random() * 10000);

    // Add random suffixes (first 3)
    for (const suffix of randomSuffixes.slice(0, 3)) {
      suggestions.push(`${baseUsername}${suffix}`);
    }

    // Add with underscore and random number
    suggestions.push(`${baseUsername}_${randomNum1}`);

    // Add with numbers only
    suggestions.push(`${baseUsername}${randomNum2}`);

    return suggestions.slice(0, 5); // Return max 5 suggestions
  },

  // ============================================
  // Validate Username Format
  // ============================================

  validateFormat(username: string): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!username || username.length < 3) {
      errors.push('Username must be at least 3 characters');
    }

    if (username.length > 30) {
      errors.push('Username must be at most 30 characters');
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      errors.push('Username can only contain letters, numbers, underscores, and hyphens');
    }

    if (!/^[a-zA-Z]/.test(username)) {
      errors.push('Username must start with a letter');
    }

    if (username.endsWith('-') || username.endsWith('_')) {
      errors.push('Username cannot end with a hyphen or underscore');
    }

    // Check for reserved usernames
    const reserved = ['admin', 'administrator', 'root', 'api', 'www', 'mail', 'support', 'help', 'contact', 'about', 'privacy', 'terms', 'youruniverse', 'youruniverseai'];
    if (reserved.includes(username.toLowerCase())) {
      errors.push('This username is reserved');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  },

  // ============================================
  // Invalidate Username Cache
  // ============================================

  async invalidateCache(username: string): Promise<void> {
    const cacheKey = `${USERNAME_CHECK_PREFIX}${username.toLowerCase()}`;
    await cache.del(cacheKey);
  },
};

export default usernameService;

