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
