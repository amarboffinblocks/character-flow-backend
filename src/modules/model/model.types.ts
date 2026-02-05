// Base Model type - Manually defined until Prisma client is regenerated
// After running `npx prisma generate`, this can be replaced with:
// export type Model = Prisma.ModelGetPayload<{}>;
export type Model = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  provider: 'openai' | 'gemini' | 'aws' | 'anthropic' | 'local';
  modelName: string | null;
  isActive: boolean;
  isDefault: boolean;
  metadata: unknown | null;
  createdAt: Date;
  updatedAt: Date;
};

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

export interface CreateModelInput {
  name: string;
  slug: string;
  description?: string | null;
  provider?: 'openai' | 'gemini' | 'aws' | 'anthropic' | 'local';
  modelName?: string | null;
  isActive?: boolean;
  isDefault?: boolean;
  metadata?: unknown;
}
