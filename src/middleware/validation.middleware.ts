import type { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError, type ZodIssue } from 'zod';
import { sendError } from '../utils/response.js';

// ============================================
// Validation Middleware Factory
// ============================================

interface ValidationSchemas {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

export const validate = (schemas: ValidationSchemas) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }

      if (schemas.query) {
        req.query = schemas.query.parse(req.query) as typeof req.query;
      }

      if (schemas.params) {
        req.params = schemas.params.parse(req.params) as Request['params'];
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.issues.map((err: ZodIssue) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        sendError(res, 'Validation failed', 'VALIDATION_ERROR', 422, details);
        return;
      }

      next(error);
    }
  };
};

// ============================================
// Body Validation
// ============================================

export const validateBody = <T>(schema: ZodSchema<T>) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.issues.map((err: ZodIssue) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        sendError(res, 'Validation failed', 'VALIDATION_ERROR', 422, details);
        return;
      }

      next(error);
    }
  };
};

// ============================================
// Query Validation
// ============================================

export const validateQuery = <T>(schema: ZodSchema<T>) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.query = schema.parse(req.query) as typeof req.query;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.issues.map((err: ZodIssue) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        sendError(res, 'Validation failed', 'VALIDATION_ERROR', 422, details);
        return;
      }

      next(error);
    }
  };
};

// ============================================
// Params Validation
// ============================================

export const validateParams = <T>(schema: ZodSchema<T>) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validated = schema.parse(req.params);
      req.params = validated as typeof req.params;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.issues.map((err: ZodIssue) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        sendError(res, 'Validation failed', 'VALIDATION_ERROR', 422, details);
        return;
      }

      next(error);
    }
  };
};

