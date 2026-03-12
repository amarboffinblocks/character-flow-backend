import { prisma } from '../../lib/prisma.js';
import type { Model, ModelQueryParams, ModelConfig } from './model.types.js';

// Prisma client delegate for Model (table "models"). Use getModelDelegate() so we fail fast if schema wasn't generated.
const getModelDelegate = () => {
  const delegate = (prisma as any).model;
  if (!delegate || typeof delegate.findMany !== 'function') {
    throw new Error(
      'Prisma client missing "model" delegate. Run "npx prisma generate" and ensure schema includes the Model model (table "models").'
    );
  }
  return delegate;
};

// ============================================
// Model Repository
// ============================================

export const modelRepository = {
  async findModelById(id: string): Promise<Model | null> {
    return getModelDelegate().findUnique({
      where: { id },
    });
  },

  async findModelBySlug(slug: string): Promise<Model | null> {
    return getModelDelegate().findUnique({
      where: { slug },
    });
  },

  async findAllModels(params?: ModelQueryParams): Promise<Model[]> {
    const where: { isActive?: boolean } = {};
    if (params?.isActive !== undefined) {
      where.isActive = params.isActive;
    }
    return getModelDelegate().findMany({
      where,
      orderBy: [
        { isDefault: 'desc' },
        { name: 'asc' },
      ],
    });
  },

  async findDefaultModel(): Promise<Model | null> {
    return getModelDelegate().findFirst({
      where: { isDefault: true, isActive: true },
    });
  },

  async createModel(data: {
    name: string;
    slug: string;
    description?: string | null;
    provider?: 'openai' | 'gemini' | 'aws' | 'anthropic' | 'local';
    modelName?: string | null;
    isActive?: boolean;
    isDefault?: boolean;
    metadata?: unknown;
    config?: ModelConfig;
  }): Promise<Model> {
    const metadata = mergeConfigIntoMetadata(data.metadata, data.config);
    return getModelDelegate().create({
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description ?? undefined,
        provider: data.provider ?? 'aws',
        modelName: data.modelName ?? undefined,
        isActive: data.isActive ?? true,
        isDefault: data.isDefault ?? false,
        metadata: metadata ? (metadata as object) : undefined,
      },
    });
  },

  async updateModel(
    id: string,
    data: {
      name?: string;
      description?: string | null;
      provider?: 'openai' | 'gemini' | 'aws' | 'anthropic' | 'local';
      modelName?: string | null;
      isActive?: boolean;
      isDefault?: boolean;
      metadata?: unknown;
      config?: ModelConfig;
    }
  ): Promise<Model> {
    const existing = await getModelDelegate().findUnique({ where: { id } });
    if (!existing) return null as unknown as Model;
    const metadata = mergeConfigIntoMetadata(data.metadata ?? existing.metadata, data.config);
    return getModelDelegate().update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.provider !== undefined && { provider: data.provider }),
        ...(data.modelName !== undefined && { modelName: data.modelName }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.isDefault !== undefined && { isDefault: data.isDefault }),
        ...(metadata !== undefined && { metadata: metadata as object }),
      },
    });
  },
};

function mergeConfigIntoMetadata(metadata: unknown, config?: ModelConfig): unknown {
  const base = metadata != null && typeof metadata === 'object' && !Array.isArray(metadata)
    ? (metadata as Record<string, unknown>)
    : {};
  if (!config) return Object.keys(base).length ? base : undefined;
  return { ...base, config };
}
