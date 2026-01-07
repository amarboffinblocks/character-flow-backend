import { nanoid } from 'nanoid';

// ============================================
// Slug Generation (Custom implementation)
// ============================================

const slugifyText = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
};

export const generateSlug = (text: string, suffix: boolean = true): string => {
  const baseSlug = slugifyText(text);
  return suffix ? `${baseSlug}-${nanoid(6)}` : baseSlug;
};

// ============================================
// String Utilities
// ============================================

export const capitalize = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

export const truncate = (str: string, length: number): string => {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
};

// ============================================
// Date Utilities
// ============================================

export const parseMs = (duration: string): number => {
  const match = duration.match(/^(\d+)(ms|s|m|h|d)$/);
  if (!match) throw new Error(`Invalid duration format: ${duration}`);

  const value = parseInt(match[1]!, 10);
  const unit = match[2];

  const multipliers: Record<string, number> = {
    ms: 1,
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return value * (multipliers[unit!] ?? 1);
};

export const addTime = (date: Date, duration: string): Date => {
  return new Date(date.getTime() + parseMs(duration));
};

// ============================================
// Object Utilities
// ============================================

export const omit = <T extends object, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> => {
  const result = { ...obj };
  for (const key of keys) {
    delete result[key];
  }
  return result;
};

export const pick = <T extends object, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> => {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }
  return result;
};

export const removeUndefined = <T extends object>(obj: T): Partial<T> => {
  const result: Partial<T> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      (result as Record<string, unknown>)[key] = value;
    }
  }
  return result;
};

// ============================================
// Array Utilities
// ============================================

export const unique = <T>(arr: T[]): T[] => [...new Set(arr)];

export const chunk = <T>(arr: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
};

// ============================================
// Random Utilities
// ============================================

export const generateCode = (length: number = 6): string => {
  return nanoid(length);
};

export const generateNumericCode = (length: number = 6): string => {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += Math.floor(Math.random() * 10);
  }
  return code;
};

// ============================================
// Retry Utility
// ============================================

export const retry = async <T>(
  fn: () => Promise<T>,
  retries: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: Error | undefined;

  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (i < retries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delay * (i + 1)));
      }
    }
  }

  throw lastError || new Error('Retry failed');
};

// ============================================
// Error Handling Utilities
// ============================================

/**
 * Safely executes an async function and returns result or null on error
 * Useful for non-critical operations that shouldn't throw
 */
export const safeAsync = async <T>(
  fn: () => Promise<T>,
  fallback?: T
): Promise<T | null> => {
  try {
    return await fn();
  } catch {
    return fallback ?? null;
  }
};

/**
 * Safely executes a function and returns result or null on error
 * Useful for non-critical operations that shouldn't throw
 */
export const safeSync = <T>(fn: () => T, fallback?: T): T | null => {
  try {
    return fn();
  } catch {
    return fallback ?? null;
  }
};

/**
 * Wraps a promise with timeout
 */
export const withTimeout = <T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage: string = 'Operation timed out'
): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
    }),
  ]);
};

/**
 * Checks if error is a network error
 */
export const isNetworkError = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    error.name === 'ECONNREFUSED' ||
    error.name === 'ETIMEDOUT' ||
    error.name === 'ENOTFOUND' ||
    message.includes('econnrefused') ||
    message.includes('etimedout') ||
    message.includes('enotfound') ||
    message.includes('network')
  );
};

/**
 * Checks if error is a database error
 */
export const isDatabaseError = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;
  return (
    error.name.includes('Prisma') ||
    error.message.toLowerCase().includes('database') ||
    error.message.toLowerCase().includes('connection')
  );
};

/**
 * Checks if error is a Redis error
 */
export const isRedisError = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;
  return (
    error.name === 'ReplyError' ||
    error.message.toLowerCase().includes('redis') ||
    error.message.toLowerCase().includes('cache')
  );
};

