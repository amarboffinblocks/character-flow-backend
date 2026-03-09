import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { AppError, createError } from '../utils/errors.js';
import { sendError } from '../utils/response.js';
import { logger } from '../lib/logger.js';
import { config } from '../config/index.js';
import { ERROR_CODES, HTTP_STATUS } from '../core/constants/index.js';

// ============================================
// Global Error Handler
// ============================================

/**
 * Comprehensive error handler that handles all types of errors:
 * - Zod validation errors
 * - Custom AppError instances
 * - Prisma database errors
 * - JWT authentication errors
 * - Redis errors
 * - Network errors
 * - Unknown errors
 */
export const errorHandler = (
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // If response already sent (e.g. streaming started), log and bail - cannot send JSON
  if (res.headersSent) {
    logger.error(
      { err: error, path: req.path, method: req.method },
      'Error after response headers sent (streaming route)'
    );
    return;
  }

  // Extract error information
  const errorObj = error instanceof Error ? error : new Error(String(error));
  const errorId = `err_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  // Get user ID if authenticated
  const userId = (req as Request & { user?: { id: string } }).user?.id;

  // Prepare error context for logging
  const errorContext = {
    errorId,
    message: errorObj.message,
    stack: config.app.isDev ? errorObj.stack : undefined, // Only include stack in dev
    path: req.path,
    method: req.method,
    ip: req.ip,
    userId,
    userAgent: req.get('user-agent'),
    body: config.app.isDev && req.method !== 'GET' ? req.body : undefined,
    query: Object.keys(req.query).length > 0 ? req.query : undefined,
    params: Object.keys(req.params).length > 0 ? req.params : undefined,
    timestamp: new Date().toISOString(),
  };

  // Handle Zod validation errors (by instance or by shape - production bundles can break instanceof)
  const zodIssues = (error as { issues?: Array<{ path?: unknown[]; message?: string; code?: string }> }).issues;
  if (error instanceof ZodError || (Array.isArray(zodIssues) && zodIssues.length > 0)) {
    const issues = error instanceof ZodError ? (error as ZodError).issues : zodIssues;
    const details = (issues || []).map((err: { path?: unknown[]; message?: string; code?: string }) => ({
      field: (err.path || []).join('.'),
      message: err.message || 'Validation error',
      code: err.code || 'invalid_type',
    }));

    logger.warn({ ...errorContext, validationErrors: details }, 'Validation error');
    sendError(res, 'Validation failed. Please check your input.', ERROR_CODES.VALIDATION_ERROR, HTTP_STATUS.UNPROCESSABLE_ENTITY, details);
    return;
  }

  // Handle custom AppError
  if (error instanceof AppError) {
    // Log operational errors at warn level, others at error level
    const logLevel = error.isOperational ? 'warn' : 'error';
    logger[logLevel]({
      ...errorContext,
      code: error.code,
      statusCode: error.statusCode,
      details: error.details,
      originalError: error.originalError,
    }, `AppError: ${error.code}`);

    // Don't expose internal error details in production
    const message = error.isOperational || config.app.isDev
      ? error.message
      : 'An error occurred. Please try again later.';

    sendError(res, message, error.code as string, error.statusCode, error.details);
    return;
  }

  // Handle JSON syntax errors (from express.json() middleware)
  if (errorObj instanceof SyntaxError && errorObj.message.includes('JSON')) {
    logger.warn({ ...errorContext }, 'JSON parsing error');
    sendError(
      res,
      'Invalid JSON format. Please check your request body for syntax errors (e.g., trailing commas, missing quotes).',
      'BAD_REQUEST',
      400,
      config.app.isDev ? { originalError: errorObj.message } : undefined
    );
    return;
  }

  // Handle Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const prismaError = handlePrismaError(error);
    logger.error({ ...errorContext, prismaCode: error.code }, 'Prisma database error');
    sendError(res, prismaError.message, prismaError.code, prismaError.statusCode, prismaError.details);
    return;
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    logger.error({ ...errorContext }, 'Prisma validation error');
    sendError(
      res,
      'Invalid data provided. Please check your input.',
      'VALIDATION_ERROR',
      422,
      config.app.isDev ? { message: error.message } : undefined
    );
    return;
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    logger.error({ ...errorContext }, 'Prisma initialization error');
    sendError(res, 'Database connection failed. Please try again later.', 'DATABASE_ERROR', 503);
    return;
  }

  if (error instanceof Prisma.PrismaClientRustPanicError) {
    logger.error({ ...errorContext }, 'Prisma panic error');
    sendError(res, 'Database error occurred. Please try again later.', 'DATABASE_ERROR', 500);
    return;
  }

  // Handle JWT errors
  if (errorObj.name === 'JsonWebTokenError' || errorObj.name === 'JWTError') {
    logger.warn({ ...errorContext }, 'JWT validation error');
    sendError(res, 'Invalid authentication token', 'UNAUTHORIZED', 401);
    return;
  }

  if (errorObj.name === 'TokenExpiredError' || errorObj.name === 'JWTExpired') {
    logger.warn({ ...errorContext }, 'JWT expired error');
    sendError(res, 'Authentication token has expired', 'TOKEN_EXPIRED', 401);
    return;
  }

  if (errorObj.name === 'JWSSignatureVerificationFailed' || errorObj.name === 'JWSInvalid') {
    logger.warn({ ...errorContext }, 'JWT signature verification failed');
    sendError(res, 'Invalid authentication token', 'UNAUTHORIZED', 401);
    return;
  }

  // Handle Redis errors (ioredis)
  if (errorObj.name === 'ReplyError' || errorObj.message?.includes('Redis')) {
    logger.error({ ...errorContext }, 'Redis error');
    sendError(
      res,
      'Cache service temporarily unavailable. Please try again.',
      'REDIS_ERROR',
      503
    );
    return;
  }

  // Handle network errors
  if (
    errorObj.name === 'ECONNREFUSED' ||
    errorObj.name === 'ETIMEDOUT' ||
    errorObj.name === 'ENOTFOUND' ||
    errorObj.message?.includes('ECONNREFUSED') ||
    errorObj.message?.includes('ETIMEDOUT') ||
    errorObj.message?.includes('ENOTFOUND')
  ) {
    logger.error({ ...errorContext }, 'Network error');
    sendError(res, 'Service temporarily unavailable. Please try again later.', 'NETWORK_ERROR', 503);
    return;
  }

  // Handle timeout errors
  if (errorObj.name === 'TimeoutError' || errorObj.message?.includes('timeout')) {
    logger.error({ ...errorContext }, 'Timeout error');
    sendError(res, 'Request timeout. Please try again.', 'TIMEOUT_ERROR', 408);
    return;
  }

  // Known deployment/setup errors: return clear message so production can be fixed
  const msg = errorObj.message || '';
  const isModelDelegateError =
    (msg.includes('Prisma client missing') && msg.includes('model')) ||
    (errorObj.name === 'TypeError' && (msg.includes("findMany") || msg.includes("findUnique") || msg.includes("findFirst") || msg.includes("create") || msg.includes("'model'")));
  if (isModelDelegateError) {
    logger.error({ ...errorContext }, 'Prisma model delegate missing (run prisma generate)');
    sendError(
      res,
      'Models API is not configured. Run "npx prisma generate" during build and ensure the database has the models table (run migrations).',
      'DATABASE_ERROR',
      503
    );
    return;
  }
  if (msg.includes("relation") && msg.includes("does not exist")) {
    logger.error({ ...errorContext }, 'Database table missing (run migrations)');
    sendError(
      res,
      'Database schema is out of date. Run "npx prisma migrate deploy" on the production database.',
      'DATABASE_ERROR',
      503
    );
    return;
  }

  // Handle unknown errors
  logger.error({ ...errorContext, errorType: errorObj.constructor.name }, 'Unhandled error');
  
  const message = config.app.isDev
    ? errorObj.message || 'An unexpected error occurred'
    : 'An unexpected error occurred. Please try again later.';

  sendError(res, message, 'INTERNAL_SERVER_ERROR', 500, config.app.isDev ? { errorId } : undefined);
};

/**
 * Handle Prisma known request errors
 */
const handlePrismaError = (error: Prisma.PrismaClientKnownRequestError): {
  message: string;
  code: string;
  statusCode: number;
  details?: unknown;
} => {
  switch (error.code) {
    case 'P2002': {
      // Unique constraint violation
      const target = error.meta?.target as string[] | undefined;
      const field = target?.[0] ?? 'field';
      const formattedField = field.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
      return {
        message: `${formattedField} already exists`,
        code: 'CONFLICT',
        statusCode: 409,
        details: { field },
      };
    }
    case 'P2025': {
      // Record not found
      return {
        message: 'Record not found',
        code: 'NOT_FOUND',
        statusCode: 404,
      };
    }
    case 'P2003': {
      // Foreign key constraint violation
      return {
        message: 'Invalid reference. Related record does not exist.',
        code: 'BAD_REQUEST',
        statusCode: 400,
      };
    }
    case 'P2014': {
      // Required relation violation
      return {
        message: 'Invalid operation. Required relation is missing.',
        code: 'BAD_REQUEST',
        statusCode: 400,
      };
    }
    case 'P2000': {
      // Value too long
      return {
        message: 'Input value is too long',
        code: 'VALIDATION_ERROR',
        statusCode: 422,
      };
    }
    case 'P2001': {
      // Record does not exist
      return {
        message: 'Record not found',
        code: 'NOT_FOUND',
        statusCode: 404,
      };
    }
    case 'P2011': {
      // Null constraint violation
      return {
        message: 'Required field is missing',
        code: 'VALIDATION_ERROR',
        statusCode: 422,
      };
    }
    case 'P2012': {
      // Missing required value
      return {
        message: 'Required field is missing',
        code: 'VALIDATION_ERROR',
        statusCode: 422,
      };
    }
    case 'P2015': {
      // Related record not found
      return {
        message: 'Related record not found',
        code: 'NOT_FOUND',
        statusCode: 404,
      };
    }
    case 'P2016': {
      // Query interpretation error
      return {
        message: 'Invalid query parameters',
        code: 'BAD_REQUEST',
        statusCode: 400,
      };
    }
    case 'P2017': {
      // Records for relation not connected
      return {
        message: 'Invalid relation. Records are not connected.',
        code: 'BAD_REQUEST',
        statusCode: 400,
      };
    }
    case 'P2018': {
      // Required connected records not found
      return {
        message: 'Required related records not found',
        code: 'NOT_FOUND',
        statusCode: 404,
      };
    }
    case 'P2019': {
      // Input error
      return {
        message: 'Invalid input data',
        code: 'VALIDATION_ERROR',
        statusCode: 422,
      };
    }
    case 'P2020': {
      // Value out of range
      return {
        message: 'Value is out of range',
        code: 'VALIDATION_ERROR',
        statusCode: 422,
      };
    }
    case 'P2021': {
      // Table does not exist
      return {
        message: 'Database table not found',
        code: 'DATABASE_ERROR',
        statusCode: 500,
      };
    }
    case 'P2022': {
      // Column does not exist
      return {
        message: 'Database column not found',
        code: 'DATABASE_ERROR',
        statusCode: 500,
      };
    }
    case 'P2024': {
      // Timed out
      return {
        message: 'Database operation timed out',
        code: 'TIMEOUT_ERROR',
        statusCode: 408,
      };
    }
    case 'P2027': {
      // Multiple errors occurred
      return {
        message: 'Multiple database errors occurred',
        code: 'DATABASE_ERROR',
        statusCode: 500,
        details: error.meta,
      };
    }
    default: {
      return {
        message: 'Database operation failed',
        code: 'DATABASE_ERROR',
        statusCode: 500,
        details: config.app.isDev ? { code: error.code, meta: error.meta } : undefined,
      };
    }
  }
};

// ============================================
// Not Found Handler
// ============================================

export const notFoundHandler = (req: Request, res: Response): void => {
  sendError(res, `Route ${req.method} ${req.path} not found`, 'NOT_FOUND', 404);
};

// ============================================
// Async Handler Wrapper
// ============================================

/**
 * Wraps async route handlers to automatically catch and forward errors to error handler
 * Removes need for try-catch blocks in route handlers
 */
export const asyncHandler = <T>(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<T> | T
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      // Ensure error is an Error instance
      if (!(error instanceof Error)) {
        error = new Error(String(error));
      }
      next(error);
    });
  };
};

/**
 * Wraps async route handlers without next parameter (for file-based routing)
 */
export const asyncRouteHandler = (
  fn: (req: Request, res: Response) => Promise<void> | void
) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await Promise.resolve(fn(req, res));
    } catch (error) {
      // Ensure error is an Error instance
      if (!(error instanceof Error)) {
        error = new Error(String(error));
      }
      next(error);
    }
  };
};

