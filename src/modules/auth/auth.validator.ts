import { z } from 'zod';
import { USERNAME_CONSTANTS, REGEX_PATTERNS } from '../../core/constants/index.js';

// ============================================
// Common Validators
// ============================================

const usernameSchema = z
  .string()
  .min(USERNAME_CONSTANTS.MIN_LENGTH, `Username must be at least ${USERNAME_CONSTANTS.MIN_LENGTH} characters`)
  .max(USERNAME_CONSTANTS.MAX_LENGTH, `Username must be at most ${USERNAME_CONSTANTS.MAX_LENGTH} characters`)
  .regex(
    USERNAME_CONSTANTS.PATTERN,
    'Username can only contain letters, numbers, underscores, and hyphens'
  )
  .refine(
    (val) => !(USERNAME_CONSTANTS.RESERVED as readonly string[]).includes(val.toLowerCase()),
    { message: 'This username is reserved and cannot be used' }
  );

const emailSchema = z
  .string()
  .email('Invalid email address')
  .toLowerCase()
  .trim()
  .regex(REGEX_PATTERNS.EMAIL, 'Invalid email format');

// ============================================
// Auth Schemas
// ============================================

// Profile Update Schema
export const updateProfileSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be at most 100 characters')
    .trim()
    .optional(),
  username: usernameSchema.optional(),
  aboutMe: z
    .string()
    .max(500, 'About me must be at most 500 characters')
    .trim()
    .nullable()
    .optional(),
  theme: z.enum(['dark-purple', 'white', 'yellow']).optional(),
  fontStyle: z.enum(['serif', 'sans-serif', 'monospace']).optional(),
  fontSize: z.enum(['12', '16', '20']).optional(),
  language: z.enum(['en', 'hi', 'es']).optional(),
  tagsToFollow: z.array(z.string()).optional(),
  tagsToAvoid: z.array(z.string()).optional(),
  profileVisibility: z.enum(['public', 'private']).optional(),
  profileRating: z.enum(['SFW', 'NSFW']).optional(),
  subscriptionPlan: z.enum(['adventurer', 'explorer', 'voyager', 'pioneer']).optional(),
  avatar: z.record(z.string(), z.unknown()).optional().nullable(),
  backgroundImg: z.record(z.string(), z.unknown()).optional().nullable(),
});

// ============================================
// Validation Helper
// ============================================

export const validate = <T>(schema: z.ZodSchema<T>, data: unknown): T => {
  return schema.parse(data);
};

// Re-export for endpoints that validate email strings
export { emailSchema, usernameSchema };
