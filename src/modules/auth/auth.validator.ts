import { z } from 'zod';
import {
  PASSWORD_CONSTANTS,
  USERNAME_CONSTANTS,
  REGEX_PATTERNS,
  OTP_CONSTANTS,
} from '../../core/constants/index.js';

// ============================================
// Common Validators
// ============================================

const passwordSchema = z
  .string()
  .min(PASSWORD_CONSTANTS.MIN_LENGTH, `Password must be at least ${PASSWORD_CONSTANTS.MIN_LENGTH} characters`)
  .max(100, 'Password must be at most 100 characters')
  .regex(
    PASSWORD_CONSTANTS.PATTERN,
    'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'
  );

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

const phoneSchema = z
  .preprocess(
    (val) => {
      if (val === undefined || val === null || val === '') return undefined;
      const digitsOnly = String(val).replace(/\D/g, '');
      return digitsOnly.length > 0 ? digitsOnly : undefined;
    },
    z
      .string()
      .regex(/^\d{7,15}$/, 'Phone number must contain 7-15 digits')
  )
  .optional();

// ============================================
// Auth Schemas
// ============================================

export const registerSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be at most 100 characters')
    .trim(),
  username: usernameSchema,
  email: emailSchema, // Required
  phoneNumber: phoneSchema, // Optional
  password: passwordSchema,
});

// Login can accept phone, email, or username
export const loginSchema = z.object({
  identifier: z
    .string()
    .min(1, 'Phone number, email, or username is required')
    .refine(
      (val) => {
        // Check if it's a phone number (starts with +)
        if (val.startsWith('+')) {
          return /^\+[1-9]\d{1,14}$/.test(val);
        }
        // Check if it's an email
        if (val.includes('@')) {
          return z.string().email().safeParse(val).success;
        }
        // Otherwise, treat as username
        return usernameSchema.safeParse(val).success;
      },
      {
        message: 'Must be a valid phone number (E.164), email, or username',
      }
    ),
  password: z.string().min(1, 'Password is required'),
});

// OTP Request Schema (for login)
export const requestOtpSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
});

// OTP Verification Schema
export const verifyOtpSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  code: z
    .string()
    .length(OTP_CONSTANTS.LENGTH, `OTP code must be ${OTP_CONSTANTS.LENGTH} digits`)
    .regex(/^\d+$/, 'OTP code must contain only digits'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

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

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: passwordSchema,
});

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
  mfaCode: z.string().length(6).optional(),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
});

export const resendVerificationEmailSchema = z.object({
  email: emailSchema,
});

export const mfaVerifySchema = z.object({
  code: z.string().length(6, 'MFA code must be 6 digits'),
  userId: z.string().uuid('Invalid user ID'),
});

// ============================================
// Type Exports
// ============================================

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type ResendVerificationEmailInput = z.infer<typeof resendVerificationEmailSchema>;
export type MfaVerifyInput = z.infer<typeof mfaVerifySchema>;
export type RequestOtpInput = z.infer<typeof requestOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;

// ============================================
// Validation Helper
// ============================================

export const validate = <T>(schema: z.ZodSchema<T>, data: unknown): T => {
  return schema.parse(data);
};

