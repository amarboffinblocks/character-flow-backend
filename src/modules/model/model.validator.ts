import { z } from 'zod';

// ============================================
// Model Schemas
// ============================================

export const modelQuerySchema = z.object({
  isActive: z
    .string()
    .optional()
    .transform((val) => val === 'true' || val === '1'),
});

export const createModelSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  description: z.string().max(1000).optional().nullable(),
  provider: z.enum(['openai', 'gemini', 'aws', 'anthropic', 'local']).optional().default('aws'),
  modelName: z.string().max(255).optional().nullable(),
  isActive: z.boolean().optional().default(true),
  isDefault: z.boolean().optional().default(false),
  metadata: z.union([z.record(z.unknown()), z.object({}).passthrough(), z.null()]).optional().nullable(),
});
