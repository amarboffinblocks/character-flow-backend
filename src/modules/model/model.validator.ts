import { z } from 'zod';

// ============================================
// Model Schemas
// ============================================

export const modelQuerySchema = z.object({
  isActive: z
    .string()
    .optional()
    .transform((val) => {
      if (val === undefined || val === null) return undefined;
      return val === 'true' || val === '1';
    }),
});

// Coerce string "true"/"false" to boolean (Swagger/proxies on production sometimes send strings)
function toBool(v: unknown, def: boolean): boolean {
  if (typeof v === 'boolean') return v;
  if (v === 'true' || v === '1') return true;
  if (v === 'false' || v === '0') return false;
  return def;
}

export const createModelSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  description: z.string().max(1000).optional().nullable(),
  provider: z.enum(['openai', 'gemini', 'aws', 'anthropic', 'local']).optional().default('aws'),
  modelName: z.string().max(255).optional().nullable(),
  isActive: z.unknown().optional().default(true).transform((v) => toBool(v, true)),
  isDefault: z.unknown().optional().default(false).transform((v) => toBool(v, false)),
  metadata: z.union([z.record(z.string(), z.unknown()), z.object({}).passthrough(), z.null()]).optional().nullable(),
});
