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

const scenarioSchema = z
  .string()
  .max(10000, 'Scenario must be at most 10000 characters')
  .trim()
  .optional()
  .nullable();

const summarySchema = z
  .string()
  .max(2000, 'Summary must be at most 2000 characters')
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

const firstMessageSchema = z
  .string()
  .max(5000, 'First message must be at most 5000 characters')
  .trim()
  .optional()
  .nullable();

const alternateMessagesSchema = z
  .array(z.string().min(1).max(5000))
  .max(10, 'Maximum 10 alternate messages allowed')
  .default([]);

const exampleDialoguesSchema = z
  .array(z.string().min(1).max(10000))
  .max(20, 'Maximum 20 example dialogues allowed')
  .default([]);

const authorNotesSchema = z
  .string()
  .max(5000, 'Author notes must be at most 5000 characters')
  .trim()
  .optional()
  .nullable();

const characterNotesSchema = z
  .string()
  .max(5000, 'Character notes must be at most 5000 characters')
  .trim()
  .optional()
  .nullable();

const authorNameSchema = z
  .string()
  .max(100, 'Author name must be at most 100 characters')
  .trim()
  .optional()
  .nullable();

const uuidSchema = z.string().uuid('Invalid ID format');

// ============================================
// Character Schemas
// ============================================

export const createCharacterSchema = z.object({
  name: nameSchema,
  description: descriptionSchema,
  scenario: scenarioSchema,
  summary: summarySchema,
  rating: ratingSchema.optional().default('SFW'),
  visibility: visibilitySchema.optional().default('private'),
  avatar: avatarSchema,
  backgroundImg: backgroundImgSchema,
  tags: tagsSchema,
  firstMessage: firstMessageSchema,
  alternateMessages: alternateMessagesSchema,
  exampleDialogues: exampleDialoguesSchema,
  authorNotes: authorNotesSchema,
  characterNotes: characterNotesSchema,
  authorName: authorNameSchema,
  personaId: uuidSchema.optional(),
  lorebookId: uuidSchema.optional(),
  realmId: uuidSchema.optional(),
});

export const updateCharacterSchema = z.object({
  name: nameSchema.optional(),
  description: descriptionSchema,
  scenario: scenarioSchema,
  summary: summarySchema,
  rating: ratingSchema.optional(),
  visibility: visibilitySchema.optional(),
  avatar: avatarSchema,
  backgroundImg: backgroundImgSchema,
  tags: tagsSchema.optional(),
  firstMessage: firstMessageSchema,
  alternateMessages: alternateMessagesSchema.optional(),
  exampleDialogues: exampleDialoguesSchema.optional(),
  authorNotes: authorNotesSchema,
  characterNotes: characterNotesSchema,
  authorName: authorNameSchema,
  personaId: uuidSchema.optional().nullable(),
  lorebookId: uuidSchema.optional().nullable(),
  realmId: uuidSchema.optional().nullable(),
  isFavourite: z.boolean().optional(),
  isSaved: z.boolean().optional(),
});

export const characterQuerySchema = z.object({
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
      // Allow 0 to fetch all characters
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
  sortBy: z.enum(['createdAt', 'updatedAt', 'name', 'chatCount']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export const batchDuplicateCharacterSchema = z.object({
  characterIds: z
    .array(z.string().uuid('Invalid character ID format'))
    .min(1, 'At least one character ID is required')
    .max(100, 'Maximum 100 characters can be duplicated at once'),
});

export const batchDeleteCharacterSchema = z.object({
  characterIds: z
    .array(z.string().uuid('Invalid character ID format'))
    .min(1, 'At least one character ID is required')
    .max(100, 'Maximum 100 characters can be deleted at once'),
});

// ============================================
// Type Exports
// ============================================

export type CreateCharacterInput = z.infer<typeof createCharacterSchema>;
export type UpdateCharacterInput = z.infer<typeof updateCharacterSchema>;
export type CharacterQueryParams = z.infer<typeof characterQuerySchema>;
export type BatchDuplicateCharacterInput = z.infer<typeof batchDuplicateCharacterSchema>;
export type BatchDeleteCharacterInput = z.infer<typeof batchDeleteCharacterSchema>;

// ============================================
// Validation Helper
// ============================================

export const validate = <T>(schema: z.ZodSchema<T>, data: unknown): T => {
  return schema.parse(data);
};

