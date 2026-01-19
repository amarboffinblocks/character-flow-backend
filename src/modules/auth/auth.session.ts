import * as jose from 'jose';
import { config } from '../../config/index.js';
import { AUTH_CONSTANTS } from '../../core/constants/index.js';
import type { JwtPayload, TokenPair } from '../../types/index.js';
import { parseMs } from '../../utils/helpers.js';
import { logger } from '../../lib/logger.js';
import { createError } from '../../utils/errors.js';

// ============================================
// JWT Secrets (as Uint8Array for jose)
// ============================================

const getAccessSecret = () => new TextEncoder().encode(config.jwt.accessSecret);
const getRefreshSecret = () => new TextEncoder().encode(config.jwt.refreshSecret);

// ============================================
// Token Generation
// ============================================

export const generateAccessToken = async (payload: Omit<JwtPayload, 'type' | 'iat' | 'exp'>): Promise<string> => {
  const jwt = await new jose.SignJWT({ ...payload, type: 'access' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(config.jwt.accessExpiresIn)
    .setSubject(payload.sub)
    .sign(getAccessSecret());

  return jwt;
};

export const generateRefreshToken = async (payload: Omit<JwtPayload, 'type' | 'iat' | 'exp'>): Promise<string> => {
  const jwt = await new jose.SignJWT({ ...payload, type: 'refresh' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(config.jwt.refreshExpiresIn)
    .setSubject(payload.sub)
    .sign(getRefreshSecret());

  return jwt;
};

export const generateTokenPair = async (payload: Omit<JwtPayload, 'type' | 'iat' | 'exp'>): Promise<TokenPair> => {
  const [accessToken, refreshToken] = await Promise.all([
    generateAccessToken(payload),
    generateRefreshToken(payload),
  ]);

  return { accessToken, refreshToken };
};

// ============================================
// Token Verification
// ============================================

export const verifyAccessToken = async (token: string): Promise<JwtPayload> => {
  try {
    const { payload } = await jose.jwtVerify(token, getAccessSecret(), {
      algorithms: ['HS256'],
    });
    
    // Validate token type
    const jwtPayload = payload as unknown as JwtPayload;
    if (jwtPayload.type !== 'access') {
      throw createError.unauthorized('Invalid token type');
    }
    
    return jwtPayload;
  } catch (error) {
    if (error instanceof jose.errors.JWTExpired) {
      logger.debug('Access token expired');
      throw createError.unauthorized('Something went wrong, try again');
    }
    if (error instanceof jose.errors.JWTInvalid) {
      logger.debug('Invalid access token');
      throw createError.unauthorized('Something went wrong, try again');
    }
    logger.warn({ err: error }, 'Token verification failed');
    throw createError.unauthorized('Something went wrong, try again');
  }
};

export const verifyRefreshToken = async (token: string): Promise<JwtPayload> => {
  try {
    const { payload } = await jose.jwtVerify(token, getRefreshSecret(), {
      algorithms: ['HS256'],
    });
    
    // Validate token type
    const jwtPayload = payload as unknown as JwtPayload;
    if (jwtPayload.type !== 'refresh') {
      throw createError.unauthorized('Invalid token type');
    }
    
    return jwtPayload;
  } catch (error) {
    if (error instanceof jose.errors.JWTExpired) {
      logger.debug('Refresh token expired');
      throw createError.unauthorized('Refresh token expired');
    }
    if (error instanceof jose.errors.JWTInvalid) {
      logger.debug('Invalid refresh token');
      throw createError.unauthorized('Invalid refresh token');
    }
    logger.warn({ err: error }, 'Refresh token verification failed');
    throw createError.unauthorized('Refresh token verification failed');
  }
};

// ============================================
// Token Utilities
// ============================================

export const getRefreshTokenExpiry = (): Date => {
  const ms = parseMs(config.jwt.refreshExpiresIn);
  return new Date(Date.now() + ms);
};

export const getAccessTokenExpiry = (): Date => {
  const ms = parseMs(config.jwt.accessExpiresIn);
  return new Date(Date.now() + ms);
};

export const decodeToken = (token: string): JwtPayload | null => {
  try {
    const decoded = jose.decodeJwt(token);
    return decoded as unknown as JwtPayload;
  } catch {
    return null;
  }
};

// ============================================
// Session Helpers
// ============================================

export const extractTokenFromHeader = (authHeader?: string): string | null => {
  if (!authHeader) {
    return null;
  }
  
  const parts = authHeader.trim().split(' ');
  if (parts.length !== 2 || parts[0] !== AUTH_CONSTANTS.TOKEN_PREFIX) {
    return null;
  }
  
  const token = parts[1];
  if (!token || token.length === 0) {
    return null;
  }
  
  return token;
};

