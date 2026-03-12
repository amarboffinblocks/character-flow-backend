// ============================================
// Model configuration (tuning params stored in metadata.config)
// ============================================

export interface ModelConfig {
  maxTokens: number;
  temperature: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
}

export const DEFAULT_MODEL_CONFIG: ModelConfig = {
  maxTokens: 512,
  temperature: 0.7,
  topP: 0.9,
  frequencyPenalty: 0.4,
  presencePenalty: 0.2,
};

/** Parse config from model metadata; returns defaults for missing/invalid values */
export function parseModelConfig(metadata: unknown): ModelConfig {
  if (metadata == null || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return { ...DEFAULT_MODEL_CONFIG };
  }
  const raw = metadata as Record<string, unknown>;
  const config = raw.config;
  if (config == null || typeof config !== 'object' || Array.isArray(config)) {
    return { ...DEFAULT_MODEL_CONFIG };
  }
  const c = config as Record<string, unknown>;
  return {
    maxTokens: typeof c.maxTokens === 'number' && c.maxTokens >= 1 && c.maxTokens <= 4096 ? c.maxTokens : DEFAULT_MODEL_CONFIG.maxTokens,
    temperature: typeof c.temperature === 'number' && c.temperature >= 0 && c.temperature <= 2 ? c.temperature : DEFAULT_MODEL_CONFIG.temperature,
    topP: typeof c.topP === 'number' && c.topP >= 0 && c.topP <= 1 ? c.topP : DEFAULT_MODEL_CONFIG.topP,
    frequencyPenalty: typeof c.frequencyPenalty === 'number' && c.frequencyPenalty >= 0 && c.frequencyPenalty <= 2 ? c.frequencyPenalty : DEFAULT_MODEL_CONFIG.frequencyPenalty,
    presencePenalty: typeof c.presencePenalty === 'number' && c.presencePenalty >= 0 && c.presencePenalty <= 2 ? c.presencePenalty : DEFAULT_MODEL_CONFIG.presencePenalty,
  };
}

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
  config?: ModelConfig;
}

export interface UpdateModelInput {
  name?: string;
  description?: string | null;
  provider?: 'openai' | 'gemini' | 'aws' | 'anthropic' | 'local';
  modelName?: string | null;
  isActive?: boolean;
  isDefault?: boolean;
  metadata?: unknown;
  config?: ModelConfig;
}
