import { z } from 'zod';
import { PAGINATION_CONSTANTS } from '../../core/constants/index.js';

// ============================================
// Chat Schemas
// ============================================

export const createChatSchema = z.object({
  characterId: z.string().uuid().optional().nullable(),
  realmId: z.string().uuid().optional().nullable(),
  folderId: z.string().uuid().optional().nullable(),
  modelId: z.string().uuid('Model ID must be a valid UUID'),
  title: z.string().max(500).trim().optional().nullable(),
});

export const updateChatSchema = z.object({
  title: z.string().max(500).trim().optional().nullable(),
  folderId: z.string().uuid().optional().nullable(),
  modelId: z.string().uuid('Model ID must be a valid UUID').optional().nullable(),
});

export const chatQuerySchema = z.object({
  page: z.preprocess(
    (v) => (v === undefined || v === null || v === '' ? '1' : v),
    z.string().transform((val) => parseInt(val, 10)).pipe(z.number().int().min(1))
  ),
  limit: z.preprocess(
    (v) => (v === undefined || v === null || v === '' ? String(PAGINATION_CONSTANTS.DEFAULT_LIMIT) : v),
    z.string().transform((val) => parseInt(val, 10)).pipe(z.number().int().min(0).max(100))
  ),
  characterId: z.string().uuid().optional(),
  realmId: z.string().uuid().optional(),
  folderId: z.string().uuid().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt']).optional().default('updatedAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

// ============================================
// Message Schemas
// ============================================

export const createMessageSchema = z.object({
  content: z.string().min(1, 'Message content is required').max(10000, 'Message content is too long'),
  role: z.enum(['user', 'assistant', 'system']).optional().default('user'),
});

export const messageQuerySchema = z.object({
  page: z.preprocess(
    (v) => (v === undefined || v === null || v === '' ? '1' : v),
    z.string().transform((val) => parseInt(val, 10)).pipe(z.number().int().min(1))
  ),
  limit: z.preprocess(
    (v) => (v === undefined || v === null || v === '' ? String(PAGINATION_CONSTANTS.DEFAULT_LIMIT) : v),
    z.string().transform((val) => parseInt(val, 10)).pipe(z.number().int().min(0).max(100))
  ),
  role: z.enum(['user', 'assistant', 'system']).optional(),
  sortBy: z.enum(['createdAt']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
});
