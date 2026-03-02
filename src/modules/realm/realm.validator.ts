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
    .record(z.string(), z.unknown())
    .optional()
    .nullable();

const tagsSchema = z
    .array(z.string().min(1).max(50))
    .max(20, 'Maximum 20 tags allowed')
    .default([]);

const uuidSchema = z.string().uuid('Invalid ID format');

// ============================================
// Realm Schemas
// ============================================

export const createRealmSchema = z.object({
    name: nameSchema,
    description: descriptionSchema,
    tags: tagsSchema,
    rating: ratingSchema.optional().default('SFW'),
    visibility: visibilitySchema.optional().default('private'),
    avatar: avatarSchema,
    characterIds: z.array(uuidSchema).optional(),
});

export const updateRealmSchema = z.object({
    name: nameSchema.optional(),
    description: descriptionSchema,
    tags: tagsSchema.optional(),
    rating: ratingSchema.optional(),
    visibility: visibilitySchema.optional(),
    avatar: avatarSchema,
    isFavourite: z.boolean().optional(),
});

export const realmQuerySchema = z.object({
    page: z
        .string()
        .optional()
        .transform((val) => (val ? parseInt(val, 10) : PAGINATION_CONSTANTS.DEFAULT_PAGE))
        .pipe(z.number().int().min(1)),
    limit: z
        .string()
        .optional()
        .transform((val) => (val ? parseInt(val, 10) : PAGINATION_CONSTANTS.DEFAULT_LIMIT))
        .pipe(z.number().int().min(0).max(PAGINATION_CONSTANTS.MAX_LIMIT)),
    search: z.string().min(1).max(100).trim().optional(),
    rating: ratingSchema.optional(),
    visibility: visibilitySchema.optional(),
    tags: z
        .string()
        .optional()
        .transform((val) => (val ? val.split(',').map((tag) => tag.trim()).filter(Boolean) : undefined)),
    isFavourite: z
        .string()
        .optional()
        .transform((val) => (val === undefined ? undefined : val === 'true')),
    sortBy: z.enum(['createdAt', 'updatedAt', 'name']).optional().default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

// ============================================
// Validation Helper
// ============================================

export const validate = <T>(schema: z.ZodSchema<T>, data: unknown): T => {
    return schema.parse(data);
};
