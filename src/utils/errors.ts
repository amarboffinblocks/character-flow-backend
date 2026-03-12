// ============================================
// Custom Error Classes
// ============================================

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly details?: unknown;
  public readonly originalError?: Error;
  public readonly timestamp: Date;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    details?: unknown,
    originalError?: Error
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    this.details = details;
    this.originalError = originalError;
    this.timestamp = new Date();

    Object.setPrototypeOf(this, AppError.prototype);

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    } else {
      this.stack = new Error().stack;
    }
  }
}

// ============================================
// Specific Error Classes
// ============================================

export class BadRequestError extends AppError {
  constructor(message: string = 'Bad request', details?: unknown) {
    super(message, 400, 'BAD_REQUEST', details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource already exists') {
    super(message, 409, 'CONFLICT');
  }
}

export class ValidationError extends AppError {
  constructor(message: string = 'Validation failed', details?: unknown) {
    super(message, 422, 'VALIDATION_ERROR', details);
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, 429, 'TOO_MANY_REQUESTS');
  }
}

export class InternalServerError extends AppError {
  constructor(message: string = 'Internal server error') {
    super(message, 500, 'INTERNAL_SERVER_ERROR');
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message: string = 'Service unavailable') {
    super(message, 503, 'SERVICE_UNAVAILABLE');
  }
}

// ============================================
// Service-Specific Error Classes
// ============================================

export class DatabaseError extends AppError {
  constructor(message: string = 'Database operation failed', originalError?: Error) {
    super(message, 500, 'DATABASE_ERROR', undefined, originalError);
  }
}

export class RedisError extends AppError {
  constructor(message: string = 'Redis operation failed', originalError?: Error) {
    super(message, 503, 'REDIS_ERROR', undefined, originalError);
  }
}

export class NetworkError extends AppError {
  constructor(message: string = 'Network request failed', originalError?: Error) {
    super(message, 503, 'NETWORK_ERROR', undefined, originalError);
  }
}

export class EmailServiceError extends AppError {
  constructor(message: string = 'Email service unavailable', originalError?: Error) {
    super(message, 503, 'EMAIL_SERVICE_ERROR', undefined, originalError);
  }
}

export class SmsServiceError extends AppError {
  constructor(message: string = 'SMS service unavailable', originalError?: Error) {
    super(message, 503, 'SMS_SERVICE_ERROR', undefined, originalError);
  }
}

export class ExternalServiceError extends AppError {
  constructor(
    serviceName: string,
    message: string = 'External service unavailable',
    originalError?: Error
  ) {
    super(message, 503, 'EXTERNAL_SERVICE_ERROR', { service: serviceName }, originalError);
  }
}

// ============================================
// Error Factory
// ============================================

// ============================================
// Zod error formatter (for consistent API error responses)
// ============================================

const MAX_ZOD_DETAILS = 10;

export function formatZodErrorForResponse(error: unknown): {
  message: string;
  details: Array<{ field: string; message: string; code: string }>;
} {
  const issues = (error as { issues?: Array<{ path?: unknown[]; message?: string; code?: string }> }).issues;
  if (!Array.isArray(issues) || issues.length === 0) {
    return { message: 'Validation failed. Please check your input.', details: [] };
  }
  const details = issues.slice(0, MAX_ZOD_DETAILS).map((err) => ({
    field: (err.path || []).join('.'),
    message: err.message || 'Validation error',
    code: err.code || 'invalid_type',
  }));
  const first = issues[0];
  if (!first) return { message: 'Validation failed. Please check your input.', details };

  const firstField = first.path ? first.path.join('.') : '';
  const message =
    issues.length === 1
      ? `Validation failed: ${firstField} ${first.message || 'Validation error'}`
      : `Validation failed: ${issues.length} error(s). First: ${firstField} - ${first.message || 'Validation error'}`;
  return { message, details };
}

export const createError = {
  badRequest: (message?: string, details?: unknown) => new BadRequestError(message, details),
  unauthorized: (message?: string) => new UnauthorizedError(message),
  forbidden: (message?: string) => new ForbiddenError(message),
  notFound: (message?: string) => new NotFoundError(message),
  conflict: (message?: string) => new ConflictError(message),
  validation: (message?: string, details?: unknown) => new ValidationError(message, details),
  tooManyRequests: (message?: string) => new TooManyRequestsError(message),
  internal: (message?: string, originalError?: Error) => new InternalServerError(message),
  unavailable: (message?: string) => new ServiceUnavailableError(message),
  database: (message?: string, originalError?: Error) => new DatabaseError(message, originalError),
  redis: (message?: string, originalError?: Error) => new RedisError(message, originalError),
  network: (message?: string, originalError?: Error) => new NetworkError(message, originalError),
  email: (message?: string, originalError?: Error) => new EmailServiceError(message, originalError),
  sms: (message?: string, originalError?: Error) => new SmsServiceError(message, originalError),
  external: (serviceName: string, message?: string, originalError?: Error) =>
    new ExternalServiceError(serviceName, message, originalError),
};

