import { z } from 'zod';
import { PAGINATION_CONSTANTS } from '../../core/constants/index.js';

// ============================================
// Common Validators
// ============================================

const ratingSchema = z.enum(['SFW', 'NSFW']);

const nameSchema = z
  .string()
  .max(100, 'Name must be at most 100 characters')
  .trim()
  .optional()
  .nullable();

const descriptionSchema = z
  .string()
  .max(5000, 'Description must be at most 5000 characters')
  .trim()
  .optional()
  .nullable();

const imageSchema = z.object({
  url: z.string().url('Invalid image URL'),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});

const tagsSchema = z
  .array(z.string().min(1).max(50))
  .max(20, 'Maximum 20 tags allowed')
  .default([]);

const uuidSchema = z.string().uuid('Invalid ID format');

// ============================================
// Background Schemas
// ============================================

export const createBackgroundSchema = z.object({
  name: nameSchema,
  description: descriptionSchema,
  image: imageSchema,
  tags: tagsSchema,
  rating: ratingSchema.optional().default('SFW'),
});

export const updateBackgroundSchema = z.object({
  name: nameSchema,
  description: descriptionSchema,
  tags: tagsSchema.optional(),
  rating: ratingSchema.optional(),
});

export const backgroundQuerySchema = z.object({
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
  tags: z
    .string()
    .optional()
    .transform((val) => (val ? val.split(',').map((tag) => tag.trim()).filter(Boolean) : undefined)),
  excludeTags: z
    .string()
    .optional()
    .transform((val) => (val ? val.split(',').map((tag) => tag.trim()).filter(Boolean) : undefined)),
  rating: ratingSchema.optional(),
  linkedTo: z.enum(['character', 'persona', 'realm']).optional(),
  sort: z.enum(['date', 'name']).optional().default('date'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
});

// ============================================
// Type Exports
// ============================================

export type CreateBackgroundInput = z.infer<typeof createBackgroundSchema>;
export type UpdateBackgroundInput = z.infer<typeof updateBackgroundSchema>;
export type BackgroundQueryParams = z.infer<typeof backgroundQuerySchema>;
