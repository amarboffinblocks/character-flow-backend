import { prisma } from '../../lib/prisma.js';
import type { Model, ModelQueryParams } from './model.types.js';

// ============================================
// Model Repository
// ============================================

export const modelRepository = {
  async findModelById(id: string): Promise<Model | null> {
    return prisma.model.findUnique({
      where: { id },
    }) as Promise<Model | null>;
  },

  async findModelBySlug(slug: string): Promise<Model | null> {
    return prisma.model.findUnique({
      where: { slug },
    }) as Promise<Model | null>;
  },

  async findAllModels(params?: ModelQueryParams): Promise<Model[]> {
    const where: { isActive?: boolean } = {};
    if (params?.isActive !== undefined) {
      where.isActive = params.isActive;
    }
    return prisma.model.findMany({
      where,
      orderBy: [
        { isDefault: 'desc' },
        { name: 'asc' },
      ],
    }) as Promise<Model[]>;
  },

  async findDefaultModel(): Promise<Model | null> {
    return prisma.model.findFirst({
      where: { isDefault: true, isActive: true },
    }) as Promise<Model | null>;
  },
};
