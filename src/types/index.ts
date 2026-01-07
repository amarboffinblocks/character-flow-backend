import type { Request, Response, NextFunction } from 'express';
import type { User as PrismaUser } from '@prisma/client';

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    message?: string;
    error?: {
        code: string;
        message: string;
        details?: unknown;
    };
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
}

// ============================================
// Request Types
// ============================================

export interface AuthUser {
    id: string;
    email: string;
    username: string;
    role: 'user' | 'admin';
}

export interface AuthenticatedRequest extends Request {
    user: AuthUser;
}

export interface OptionalAuthRequest extends Request {
    user?: AuthUser;
}

// ============================================
// Route Handler Types
// ============================================

export type RouteHandler<
    TParams = Record<string, string>,
    TBody = unknown,
    TQuery = Record<string, string>,
> = (
    req: Request<TParams, unknown, TBody, TQuery>,
    res: Response
) => Promise<void> | void;

export type AuthRouteHandler<
    TParams = Record<string, string>,
    TBody = unknown,
    TQuery = Record<string, string>,
> = (
    req: AuthenticatedRequest & Request<TParams, unknown, TBody, TQuery>,
    res: Response
) => Promise<void> | void;

export type MiddlewareHandler = (
    req: Request,
    res: Response,
    next: NextFunction
) => Promise<void> | void;

// ============================================
// Route Configuration
// ============================================

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface RouteConfig {
    GET?: RouteHandler;
    POST?: RouteHandler;
    PUT?: RouteHandler;
    PATCH?: RouteHandler;
    DELETE?: RouteHandler;
}

export interface RouteModule {
    default?: RouteConfig;
    GET?: RouteHandler;
    POST?: RouteHandler;
    PUT?: RouteHandler;
    PATCH?: RouteHandler;
    DELETE?: RouteHandler;
    middleware?: MiddlewareHandler[];
}

// ============================================
// Pagination Types
// ============================================

export interface PaginationParams {
    page?: number;
    limit?: number;
    sort?: string;
    order?: 'asc' | 'desc';
}

export interface PaginationMeta {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
}

// ============================================
// Filter Types
// ============================================

export interface BaseFilterParams extends PaginationParams {
    search?: string;
    rating?: 'SFW' | 'NSFW';
    visibility?: 'public' | 'private';
    isFavourite?: boolean;
    isSaved?: boolean;
    tags?: string[];
}

// ============================================
// User Types (without sensitive fields)
// ============================================

export type SafeUser = Omit<PrismaUser, 'password'>;

// ============================================
// JWT Types
// ============================================

export interface JwtPayload {
    sub: string;
    email: string;
    username: string;
    role: 'user' | 'admin';
    type: 'access' | 'refresh';
    iat?: number;
    exp?: number;
}

export interface TokenPair {
    accessToken: string;
    refreshToken: string;
}

// ============================================
// Idempotency
// ============================================

export interface IdempotencyRecord {
    key: string;
    response: ApiResponse;
    statusCode: number;
    createdAt: Date;
}

