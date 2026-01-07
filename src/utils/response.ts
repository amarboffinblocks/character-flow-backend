import type { Response } from 'express';
import type { ApiResponse, PaginatedResponse, PaginationMeta } from '../types/index.js';
import { HTTP_STATUS, PAGINATION_CONSTANTS } from '../core/constants/index.js';

// ============================================
// Success Response Helpers
// ============================================

export const sendSuccess = <T>(
  res: Response,
  data: T,
  message?: string,
  statusCode: number = HTTP_STATUS.OK
): void => {
  const response: ApiResponse<T> = {
    success: true,
    data,
    message,
  };

  res.status(statusCode).json(response);
};

export const sendCreated = <T>(res: Response, data: T, message: string = 'Created successfully'): void => {
  sendSuccess(res, data, message, HTTP_STATUS.CREATED);
};

export const sendNoContent = (res: Response): void => {
  res.status(HTTP_STATUS.NO_CONTENT).send();
};

// ============================================
// Paginated Response Helper
// ============================================

export const sendPaginated = <T>(
  res: Response,
  data: T[],
  pagination: PaginationMeta,
  message?: string
): void => {
  const response: PaginatedResponse<T> = {
    success: true,
    data,
    pagination,
    message,
  };

  res.status(HTTP_STATUS.OK).json(response);
};

// ============================================
// Error Response Helper
// ============================================

export const sendError = (
  res: Response,
  message: string,
  code: string = 'ERROR',
  statusCode: number = 500,
  details?: unknown
): void => {
  const response: ApiResponse = {
    success: false,
    error: {
      code,
      message,
      details,
    },
  };

  res.status(statusCode).json(response);
};

// ============================================
// Pagination Calculator
// ============================================

export const calculatePagination = (
  page: number,
  limit: number,
  total: number
): PaginationMeta => {
  const totalPages = Math.ceil(total / limit);

  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
};

// ============================================
// Parse Pagination Query
// ============================================

export const parsePaginationQuery = (query: {
  page?: string;
  limit?: string;
  sort?: string;
  order?: string;
}): { page: number; limit: number; skip: number; sort?: string; order: 'asc' | 'desc' } => {
  const page = Math.max(PAGINATION_CONSTANTS.DEFAULT_PAGE, parseInt(query.page || String(PAGINATION_CONSTANTS.DEFAULT_PAGE), 10));
  const limit = Math.min(
    PAGINATION_CONSTANTS.MAX_LIMIT,
    Math.max(PAGINATION_CONSTANTS.MIN_LIMIT, parseInt(query.limit || String(PAGINATION_CONSTANTS.DEFAULT_LIMIT), 10))
  );
  const skip = (page - 1) * limit;
  const order = query.order === 'desc' ? 'desc' : 'asc';

  return { page, limit, skip, sort: query.sort, order };
};

