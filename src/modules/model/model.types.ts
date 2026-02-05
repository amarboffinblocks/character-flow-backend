import { prisma } from '../../lib/prisma.js';

// Base Model type
export type Model = NonNullable<Awaited<ReturnType<typeof prisma.model.findFirst<{}>>>>;

// ============================================
// Request/Response DTOs
// ============================================

export interface ModelResponse {
  model: Model;
}

export interface ModelListResponse {
  models: Model[];
}

export interface ModelQueryParams {
  isActive?: boolean;
}
