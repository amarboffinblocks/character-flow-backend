import { prisma } from '../../lib/prisma.js';
import type { Model, ModelQueryParams } from './model.types.js';

// ============================================
// Model Repository
// ============================================

export const modelRepository = {
  async findModelById(id: string): Promise<Model | null> {
    return (prisma as any).model.findUnique({
      where: { id },
    });
  },

  async findModelBySlug(slug: string): Promise<Model | null> {
    return (prisma as any).model.findUnique({
      where: { slug },
    });
  },

  async findAllModels(params?: ModelQueryParams): Promise<Model[]> {
    const where: { isActive?: boolean } = {};
    if (params?.isActive !== undefined) {
      where.isActive = params.isActive;
    }
    return (prisma as any).model.findMany({
      where,
      orderBy: [
        { isDefault: 'desc' },
        { name: 'asc' },
      ],
    });
  },

  async findDefaultModel(): Promise<Model | null> {
    return (prisma as any).model.findFirst({
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
    return (prisma as any).model.create({
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
