import { prisma } from '../../lib/prisma.js';
import type { Model, ModelQueryParams } from './model.types.js';
import type { PrismaClient } from '@prisma/client';

// Type assertion to help TypeScript recognize the model property
// This is a workaround for TypeScript language server cache issues
// The model property exists at runtime (verified via runtime check)
// After TypeScript language server reloads, this can be removed
const prismaWithModel = prisma as PrismaClientWithModel;

type PrismaClientWithModel = PrismaClient & {
  model: {
    findUnique: <T extends { where: { id: string } | { slug: string } }>(args: T) => Promise<Model | null>;
    findFirst: <T extends { where: { isDefault: boolean; isActive: boolean } }>(args: T) => Promise<Model | null>;
    findMany: <T extends { where?: { isActive?: boolean }; orderBy: Array<{ isDefault: 'desc' } | { name: 'asc' }> }>(args: T) => Promise<Model[]>;
    create: <T extends { data: unknown }>(args: T) => Promise<Model>;
  };
};

// ============================================
// Model Repository
// ============================================

export const modelRepository = {
  async findModelById(id: string): Promise<Model | null> {
    return prismaWithModel.model.findUnique({
      where: { id },
    });
  },

  async findModelBySlug(slug: string): Promise<Model | null> {
    return prismaWithModel.model.findUnique({
      where: { slug },
    });
  },

  async findAllModels(params?: ModelQueryParams): Promise<Model[]> {
    const where: { isActive?: boolean } = {};
    if (params?.isActive !== undefined) {
      where.isActive = params.isActive;
    }
    return prismaWithModel.model.findMany({
      where,
      orderBy: [
        { isDefault: 'desc' },
        { name: 'asc' },
      ],
    });
  },

  async findDefaultModel(): Promise<Model | null> {
    return prismaWithModel.model.findFirst({
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
    return prismaWithModel.model.create({
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
