import { z } from 'zod';
import { PAGINATION_CONSTANTS } from '../../core/constants/index.js';

// ============================================
// Common Validators
// ============================================

const nameSchema = z
  .string()
  .min(1, 'Name is required')
  .max(100, 'Name must be at most 100 characters')
  .trim();

const descriptionSchema = z
  .string()
  .max(500, 'Description must be at most 500 characters')
  .trim()
  .optional()
  .nullable();

const colorSchema = z
  .string()
  .max(50, 'Color must be at most 50 characters')
  .trim()
  .regex(/^#[0-9A-Fa-f]{6}$|^[a-zA-Z]+$/, 'Color must be a valid hex color (e.g., #FF5733) or color name')
  .optional()
  .nullable();

// ============================================
// Folder Schemas
// ============================================

export const createFolderSchema = z.object({
  name: nameSchema,
  description: descriptionSchema,
  color: colorSchema,
});

export const updateFolderSchema = z.object({
  name: nameSchema.optional(),
  description: descriptionSchema,
  color: colorSchema,
});

export const folderQuerySchema = z.object({
  page: z.preprocess(
    (v) => (v === undefined || v === null || v === '' ? '1' : v),
    z.string().transform((val) => parseInt(val, 10)).pipe(z.number().int().min(1))
  ),
  limit: z.preprocess(
    (v) => (v === undefined || v === null || v === '' ? String(PAGINATION_CONSTANTS.DEFAULT_LIMIT) : v),
    z.string().transform((val) => parseInt(val, 10)).pipe(z.number().int().min(0).max(100))
  ),
  search: z.string().trim().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'name']).optional().default('updatedAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});
