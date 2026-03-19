import { z } from 'zod';
import { PAGINATION_CONSTANTS } from '../../core/constants/index.js';

// ============================================
// Common Validators
// ============================================

// Optional UUID schema - handles empty strings, null, and undefined
const optionalUuidSchema = z
  .union([
    z.string().uuid('Invalid UUID format'),
    z.string().length(0),
    z.null(),
    z.undefined(),
  ])
  .optional()
  .nullable()
  .transform((val) => (val === '' ? null : val));

// ============================================
// Chat Schemas
// ============================================

export const createChatSchema = z.object({
  characterId: optionalUuidSchema,
  realmId: optionalUuidSchema,
  folderId: optionalUuidSchema,
  modelId: optionalUuidSchema,
  title: z.string().max(500).trim().optional().nullable(),
});

export const updateChatSchema = z.object({
  title: z.string().max(500).trim().optional().nullable(),
  folderId: optionalUuidSchema,
  modelId: optionalUuidSchema,
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

const attachmentSchema = z.object({
  type: z.literal('file'),
  url: z.string(),
  mediaType: z.string().optional(),
  filename: z.string().optional(),
});

export const createMessageSchema = z
  .object({
    content: z.string().max(10000, 'Message content is too long').optional(),
    role: z.enum(['user', 'assistant', 'system']).optional().default('user'),
    trigger: z.enum(['regenerate', 'edit']).optional(),
    messageId: z.string().uuid().optional(),
    attachments: z.array(attachmentSchema).optional().default([]),
  })
  .refine(
    (data) => {
      if (data.trigger === 'regenerate') return true;
      if (data.trigger === 'edit') return !!data.messageId && !!data.content?.trim();
      const hasContent = !!data.content && data.content.length > 0;
      const hasAttachments = (data.attachments?.length ?? 0) > 0;
      return hasContent || hasAttachments;
    },
    { message: 'Either content, attachments, or trigger+messageId (for regenerate/edit) is required' }
  );

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
