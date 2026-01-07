/**
 * Application-wide constants
 * Centralized constants for better maintainability
 */

// ============================================
// HTTP Status Codes
// ============================================
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

// ============================================
// Error Codes
// ============================================
export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  REDIS_ERROR: 'REDIS_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  EMAIL_SERVICE_ERROR: 'EMAIL_SERVICE_ERROR',
  SMS_SERVICE_ERROR: 'SMS_SERVICE_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
} as const;

// ============================================
// Authentication Constants
// ============================================
export const AUTH_CONSTANTS = {
  TOKEN_PREFIX: 'Bearer',
  HEADER_NAME: 'Authorization',
  IDEMPOTENCY_HEADER: 'Idempotency-Key',
  ACCESS_TOKEN_COOKIE: 'access_token',
  REFRESH_TOKEN_COOKIE: 'refresh_token',
} as const;

// ============================================
// OTP Constants
// ============================================
export const OTP_CONSTANTS = {
  LENGTH: 6,
  EXPIRY_MINUTES: 5,
  MAX_ATTEMPTS: 3,
  RATE_LIMIT_SECONDS: 60,
  RATE_LIMIT_MAX_REQUESTS: 3,
} as const;

// ============================================
// Username Constants
// ============================================
export const USERNAME_CONSTANTS = {
  MIN_LENGTH: 3,
  MAX_LENGTH: 30,
  PATTERN: /^[a-zA-Z0-9_-]+$/,
  CACHE_TTL: 60 * 60, // 1 hour
  RESERVED: ['admin', 'root', 'test', 'support', 'api', 'auth', 'system'],
} as const;

// ============================================
// Password Constants
// ============================================
export const PASSWORD_CONSTANTS = {
  MIN_LENGTH: 8,
  REQUIRE_UPPERCASE: true,
  REQUIRE_LOWERCASE: true,
  REQUIRE_NUMBER: true,
  REQUIRE_SPECIAL: true,
  PATTERN: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
} as const;

// ============================================
// Rate Limiting Constants
// ============================================
export const RATE_LIMIT_CONSTANTS = {
  GENERAL_WINDOW_MS: 60000, // 1 minute
  GENERAL_MAX: 100,
  AUTH_WINDOW_MS: 60000,
  AUTH_MAX: 5,
  UPLOAD_MAX: 10,
  SENSITIVE_MAX: 3,
  USERNAME_CHECK_MAX: 30,
} as const;

// ============================================
// Cache Keys Prefixes
// ============================================
export const CACHE_PREFIXES = {
  USERNAME_AVAILABILITY: 'username_availability:',
  SESSION: 'session:',
  RATE_LIMIT: 'ratelimit:',
  IDEMPOTENCY: 'idempotency:',
  BLACKLIST: 'blacklist:',
  OTP: 'otp:',
} as const;

// ============================================
// Cache TTL (in seconds)
// ============================================
export const CACHE_TTL = {
  USERNAME_AVAILABILITY: 3600, // 1 hour
  SESSION: 7 * 24 * 60 * 60, // 7 days
  IDEMPOTENCY: 24 * 60 * 60, // 24 hours
  OTP: 5 * 60, // 5 minutes
} as const;

// ============================================
// Pagination Constants
// ============================================
export const PAGINATION_CONSTANTS = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
  MIN_LIMIT: 1,
} as const;

// ============================================
// File Upload Constants
// ============================================
export const UPLOAD_CONSTANTS = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  MAX_FILES: 5,
} as const;

// ============================================
// Regex Patterns
// ============================================
export const REGEX_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_E164: /^\+[1-9]\d{1,14}$/,
  USERNAME: USERNAME_CONSTANTS.PATTERN,
  PASSWORD: PASSWORD_CONSTANTS.PATTERN,
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  SLUG: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
} as const;

// ============================================
// Time Constants
// ============================================
export const TIME_CONSTANTS = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
} as const;

