import { z } from 'zod';
import { PAGINATION_CONSTANTS } from '../../core/constants/index.js';

// ============================================
// Common Validators
// ============================================

const ratingSchema = z.enum(['SFW', 'NSFW']);

const nameSchema = z
  .string()
  .min(1, 'Name is required')
  .max(50, 'Name must be at most 50 characters')
  .trim()
  .toLowerCase(); // Normalize to lowercase

const descriptionSchema = z
  .string()
  .max(500, 'Description must be at most 500 characters')
  .trim()
  .optional()
  .nullable();

const uuidSchema = z.string().uuid('Invalid ID format');

// ============================================
// Tag Schemas
// ============================================

export const createTagSchema = z.object({
  name: nameSchema,
  category: ratingSchema,
  description: descriptionSchema,
});

export const updateTagSchema = z.object({
  name: nameSchema.optional(),
  category: ratingSchema.optional(),
  description: descriptionSchema,
});

export const tagQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : PAGINATION_CONSTANTS.DEFAULT_PAGE))
    .pipe(z.number().int().min(1)),
  limit: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return PAGINATION_CONSTANTS.DEFAULT_LIMIT;
      const parsed = parseInt(val, 10);
      if (parsed === 0) return 0;
      return parsed;
    })
    .pipe(z.number().int().min(0).max(PAGINATION_CONSTANTS.MAX_LIMIT)),
  search: z.string().min(1).max(100).trim().optional(),
  category: ratingSchema.optional(),
  sortBy: z.enum(['name', 'usageCount', 'createdAt']).optional().default('name'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
});

// ============================================
// Type Exports
// ============================================

export type CreateTagInput = z.infer<typeof createTagSchema>;
export type UpdateTagInput = z.infer<typeof updateTagSchema>;
export type TagQueryParams = z.infer<typeof tagQuerySchema>;

// ============================================
// Validation Helper
// ============================================

export const validate = <T>(schema: z.ZodSchema<T>, data: unknown): T => {
  return schema.parse(data);
};

