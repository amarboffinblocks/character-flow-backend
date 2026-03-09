import { prisma } from '../../lib/prisma.js';
import type { Model, ModelQueryParams } from './model.types.js';

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
  }): Promise<Model> {
    return getModelDelegate().create({
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description ?? undefined,
        provider: data.provider ?? 'aws',
        modelName: data.modelName ?? undefined,
        isActive: data.isActive ?? true,
        isDefault: data.isDefault ?? false,
        metadata: data.metadata ? (data.metadata as any) : undefined,
      },
    });
  },
};
