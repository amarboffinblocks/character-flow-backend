/**
 * Authentication decorators for route handlers
 * Provides a clean way to mark routes with authentication requirements
 */

import type { Request, Response } from 'express';
import { requireAuth, requireAdmin, optionalAuth } from '../../middleware/auth.middleware.js';

/**
 * Metadata for route authentication
 */
export interface RouteAuthMetadata {
  required: boolean;
  roles?: string[];
  optional?: boolean;
}

/**
 * Decorator to mark a route as requiring authentication
 */
export const Authenticated = (): MethodDecorator => {
  return (target: unknown, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;
    descriptor.value = async function (req: Request, res: Response, next?: () => void) {
      await requireAuth(req, res, () => {
        originalMethod.call(this, req, res);
      });
    };
    return descriptor;
  };
};

/**
 * Decorator to mark a route as requiring admin role
 */
export const AdminOnly = (): MethodDecorator => {
  return (target: unknown, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;
    descriptor.value = async function (req: Request, res: Response, next?: () => void) {
      await requireAdmin(req, res, () => {
        originalMethod.call(this, req, res);
      });
    };
    return descriptor;
  };
};

/**
 * Decorator to mark a route with optional authentication
 */
export const OptionalAuth = (): MethodDecorator => {
  return (target: unknown, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;
    descriptor.value = async function (req: Request, res: Response, next?: () => void) {
      await optionalAuth(req, res, () => {
        originalMethod.call(this, req, res);
      });
    };
    return descriptor;
  };
};

