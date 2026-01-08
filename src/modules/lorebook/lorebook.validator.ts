import { z } from 'zod';
import { PAGINATION_CONSTANTS } from '../../core/constants/index.js';

// ============================================
// Common Validators
// ============================================

const ratingSchema = z.enum(['SFW', 'NSFW']);
const visibilitySchema = z.enum(['public', 'private']);

const nameSchema = z
  .string()
  .min(1, 'Name is required')
  .max(100, 'Name must be at most 100 characters')
  .trim();

const descriptionSchema = z
  .string()
  .max(5000, 'Description must be at most 5000 characters')
  .trim()
  .optional()
  .nullable();

const avatarSchema = z
  .record(z.unknown())
  .optional()
  .nullable();

const tagsSchema = z
  .array(z.string().min(1).max(50))
  .max(20, 'Maximum 20 tags allowed')
  .default([]);

const uuidSchema = z.string().uuid('Invalid ID format');

// ============================================
// Lorebook Entry Validators
// ============================================

const keywordsSchema = z
  .array(z.string().min(1).max(100).trim())
  .min(1, 'At least one keyword is required')
  .max(50, 'Maximum 50 keywords allowed per entry');

const contextSchema = z
  .string()
  .min(1, 'Context is required')
  .max(10000, 'Context must be at most 10000 characters')
  .trim();

const prioritySchema = z
  .number()
  .int()
  .min(0, 'Priority must be at least 0')
  .max(100, 'Priority must be at most 100')
  .default(0);

// ============================================
// Lorebook Entry Schemas
// ============================================

export const createLorebookEntrySchema = z.object({
  keywords: keywordsSchema,
  context: contextSchema,
  isEnabled: z.boolean().optional().default(true),
  priority: prioritySchema,
});

export const updateLorebookEntrySchema = z.object({
  keywords: keywordsSchema.optional(),
  context: contextSchema.optional(),
  isEnabled: z.boolean().optional(),
  priority: prioritySchema.optional(),
});

// ============================================
// Lorebook Schemas
// ============================================

export const createLorebookSchema = z.object({
  name: nameSchema,
  description: descriptionSchema,
  rating: ratingSchema.optional().default('SFW'),
  visibility: visibilitySchema.optional().default('private'),
  avatar: avatarSchema,
  tags: tagsSchema,
  entries: z.array(createLorebookEntrySchema).max(100, 'Maximum 100 entries allowed').optional().default([]),
});

export const updateLorebookSchema = z.object({
  name: nameSchema.optional(),
  description: descriptionSchema,
  rating: ratingSchema.optional(),
  visibility: visibilitySchema.optional(),
  avatar: avatarSchema,
  tags: tagsSchema.optional(),
  isFavourite: z.boolean().optional(),
  isSaved: z.boolean().optional(),
});

export const lorebookQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : PAGINATION_CONSTANTS.DEFAULT_PAGE))
    .pipe(z.number().int().min(1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : PAGINATION_CONSTANTS.DEFAULT_LIMIT))
    .pipe(z.number().int().min(1).max(PAGINATION_CONSTANTS.MAX_LIMIT)),
  search: z.string().min(1).max(100).trim().optional(),
  rating: ratingSchema.optional(),
  visibility: visibilitySchema.optional(),
  tags: z
    .string()
    .optional()
    .transform((val) => (val ? val.split(',').map((tag) => tag.trim()).filter(Boolean) : undefined)),
  excludeTags: z
    .string()
    .optional()
    .transform((val) => (val ? val.split(',').map((tag) => tag.trim()).filter(Boolean) : undefined)),
  isFavourite: z
    .string()
    .optional()
    .transform((val) => (val === undefined ? undefined : val === 'true')),
  isSaved: z
    .string()
    .optional()
    .transform((val) => (val === undefined ? undefined : val === 'true')),
  sortBy: z.enum(['createdAt', 'updatedAt', 'name']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export const batchDeleteLorebookSchema = z.object({
  lorebookIds: z
    .array(z.string().uuid('Invalid lorebook ID format'))
    .min(1, 'At least one lorebook ID is required')
    .max(100, 'Maximum 100 lorebooks can be deleted at once'),
});

// ============================================
// Type Exports
// ============================================

export type CreateLorebookInput = z.infer<typeof createLorebookSchema>;
export type UpdateLorebookInput = z.infer<typeof updateLorebookSchema>;
export type LorebookQueryParams = z.infer<typeof lorebookQuerySchema>;
export type CreateLorebookEntryInput = z.infer<typeof createLorebookEntrySchema>;
export type UpdateLorebookEntryInput = z.infer<typeof updateLorebookEntrySchema>;
export type BatchDeleteLorebookInput = z.infer<typeof batchDeleteLorebookSchema>;

// ============================================
// Validation Helper
// ============================================

export const validate = <T>(schema: z.ZodSchema<T>, data: unknown): T => {
  return schema.parse(data);
};

