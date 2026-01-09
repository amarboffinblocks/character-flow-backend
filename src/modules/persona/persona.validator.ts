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

const backgroundImgSchema = z
  .record(z.unknown())
  .optional()
  .nullable();

const tagsSchema = z
  .array(z.string().min(1).max(50))
  .max(20, 'Maximum 20 tags allowed')
  .default([]);

const uuidSchema = z.string().uuid('Invalid ID format');

// Optional UUID schema - handles empty strings and undefined
const optionalUuidSchema = z
  .string()
  .optional()
  .refine(
    (val) => {
      // If value is undefined, null, or empty string, it's valid (optional)
      if (!val || val.trim() === '') return true;
      // If value is provided, it must be a valid UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      return uuidRegex.test(val);
    },
    { message: 'Invalid ID format' }
  );

// ============================================
// Persona Schemas
// ============================================

export const createPersonaSchema = z.object({
  name: nameSchema,
  description: descriptionSchema,
  rating: ratingSchema.optional().default('SFW'),
  visibility: visibilitySchema.optional().default('private'),
  avatar: avatarSchema,
  backgroundImg: backgroundImgSchema,
  tags: tagsSchema,
  lorebookId: optionalUuidSchema,
});

export const updatePersonaSchema = z.object({
  name: nameSchema.optional(),
  description: descriptionSchema,
  rating: ratingSchema.optional(),
  visibility: visibilitySchema.optional(),
  avatar: avatarSchema,
  backgroundImg: backgroundImgSchema,
  tags: tagsSchema.optional(),
  lorebookId: optionalUuidSchema.nullable(),
  isFavourite: z.boolean().optional(),
  isSaved: z.boolean().optional(),
});

export const personaQuerySchema = z.object({
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
      // Allow 0 to fetch all personas
      if (parsed === 0) return 0;
      return parsed;
    })
    .pipe(z.number().int().min(0).max(PAGINATION_CONSTANTS.MAX_LIMIT)),
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

export const batchDeletePersonaSchema = z.object({
  personaIds: z
    .array(z.string().uuid('Invalid persona ID format'))
    .min(1, 'At least one persona ID is required')
    .max(100, 'Maximum 100 personas can be deleted at once'),
});

// ============================================
// Type Exports
// ============================================

export type CreatePersonaInput = z.infer<typeof createPersonaSchema>;
export type UpdatePersonaInput = z.infer<typeof updatePersonaSchema>;
export type PersonaQueryParams = z.infer<typeof personaQuerySchema>;
export type BatchDeletePersonaInput = z.infer<typeof batchDeletePersonaSchema>;

// ============================================
// Validation Helper
// ============================================

export const validate = <T>(schema: z.ZodSchema<T>, data: unknown): T => {
  return schema.parse(data);
};
