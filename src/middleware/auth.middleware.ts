import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, extractTokenFromHeader } from '../modules/auth/auth.session.js';
import { sendError } from '../utils/response.js';
import { createError } from '../utils/errors.js';
import { AUTH_CONSTANTS, ERROR_CODES, HTTP_STATUS } from '../core/constants/index.js';
import type { AuthenticatedRequest, AuthUser } from '../types/index.js';
import { logger } from '../lib/logger.js';

// ============================================
// Auth Middleware - Require Authentication
// ============================================

/**
 * Authentication guard - requires valid access token
 * Attaches authenticated user to request object
 */
export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers[AUTH_CONSTANTS.HEADER_NAME.toLowerCase()] as string | undefined;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      logger.warn({ path: req.path, method: req.method, ip: req.ip }, 'Authentication required but no token provided');
      sendError(res, 'Authentication required', ERROR_CODES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED);
      return;
    }

    const payload = await verifyAccessToken(token);

    // Attach authenticated user to request
    (req as AuthenticatedRequest).user = {
      id: payload.sub,
      email: payload.email,
      username: payload.username,
      role: payload.role,
    };

    logger.debug({ userId: payload.sub, path: req.path }, 'User authenticated');
    next();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Invalid or expired token';
    logger.warn({ err: error, path: req.path, ip: req.ip }, 'Authentication failed');
    sendError(res, errorMessage, ERROR_CODES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED);
  }
};

// ============================================
// Auth Middleware - Optional Authentication
// ============================================

/**
 * Optional authentication guard - attaches user if token is valid
 * Continues without user if token is missing or invalid
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers[AUTH_CONSTANTS.HEADER_NAME.toLowerCase()] as string | undefined;
    const token = extractTokenFromHeader(authHeader);

    if (token) {
      try {
        const payload = await verifyAccessToken(token);
        (req as AuthenticatedRequest).user = {
          id: payload.sub,
          email: payload.email,
          username: payload.username,
          role: payload.role,
        };
        logger.debug({ userId: payload.sub }, 'Optional auth: user authenticated');
      } catch {
        // Token invalid, continue without user
        logger.debug({ path: req.path }, 'Optional auth: invalid token, continuing without user');
      }
    }

    next();
  } catch (error) {
    // Unexpected error, log but continue
    logger.error({ err: error, path: req.path }, 'Optional auth: unexpected error');
    next();
  }
};

// ============================================
// Auth Middleware - Require Admin Role
// ============================================

/**
 * Admin role guard - requires valid access token with admin role
 */
export const requireAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers[AUTH_CONSTANTS.HEADER_NAME.toLowerCase()] as string | undefined;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      logger.warn({ path: req.path, ip: req.ip }, 'Admin access attempted without token');
      sendError(res, 'Authentication required', ERROR_CODES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED);
      return;
    }

    const payload = await verifyAccessToken(token);

    if (payload.role !== 'admin') {
      logger.warn({ userId: payload.sub, path: req.path, role: payload.role }, 'Admin access denied: insufficient role');
      sendError(res, 'Admin access required', ERROR_CODES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
      return;
    }

    // Attach admin user to request
    (req as AuthenticatedRequest).user = {
      id: payload.sub,
      email: payload.email,
      username: payload.username,
      role: payload.role,
    };

    logger.debug({ userId: payload.sub, path: req.path }, 'Admin access granted');
    next();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Invalid or expired token';
    logger.warn({ err: error, path: req.path }, 'Admin authentication failed');
    sendError(res, errorMessage, ERROR_CODES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED);
  }
};

// ============================================
// Get Current User Helper
// ============================================

/**
 * Get current authenticated user from request
 * Returns undefined if user is not authenticated
 */
export const getCurrentUser = (req: Request): AuthUser | undefined => {
  return (req as AuthenticatedRequest).user;
};

/**
 * Require current authenticated user
 * Throws error if user is not authenticated
 */
export const requireCurrentUser = (req: Request): AuthUser => {
  const user = getCurrentUser(req);
  if (!user) {
    throw createError.unauthorized('User not authenticated');
  }
  return user;
};

