import type { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response.js';
import { createError } from '../utils/errors.js';
import { ERROR_CODES, HTTP_STATUS } from '../core/constants/index.js';
import type { AuthenticatedRequest, AuthUser } from '../types/index.js';
import { logger } from '../lib/logger.js';
import { authService } from '../modules/auth/index.js';

// ============================================
// Open access: all routes attach the shared guest user (no JWT)
// ============================================

/**
 * Attach the configured default guest user to the request (always succeeds once DB is ready).
 */
export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user: AuthUser = await authService.getGuestAuthUser();
    (req as AuthenticatedRequest).user = user;
    logger.debug({ userId: user.id, path: req.path }, 'Guest user attached');
    next();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unable to resolve guest user';
    logger.error({ err: error, path: req.path }, 'Guest auth failed');
    sendError(res, errorMessage, ERROR_CODES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED);
  }
};

/**
 * Same as requireAuth — anonymous browsing uses the same default user context.
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user: AuthUser = await authService.getGuestAuthUser();
    (req as AuthenticatedRequest).user = user;
    logger.debug({ userId: user.id, path: req.path }, 'Optional auth: guest attached');
  } catch (error) {
    logger.warn({ err: error, path: req.path }, 'Optional auth: guest unavailable');
  }
  next();
};

export const requireAdmin = requireAuth;

export const getCurrentUser = (req: Request): AuthUser | undefined => {
  return (req as AuthenticatedRequest).user;
};

export const requireCurrentUser = (req: Request): AuthUser => {
  const user = getCurrentUser(req);
  if (!user) {
    throw createError.unauthorized('User not authenticated');
  }
  return user;
};
