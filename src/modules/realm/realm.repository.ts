import { prisma } from '../../lib/prisma.js';
import type { Realm, Rating, Visibility } from '@prisma/client';
import { Prisma } from '@prisma/client';
import type { CreateRealmData, UpdateRealmData, RealmQueryParams } from './realm.types.js';

// ============================================
// Realm Repository
// ============================================

export const realmRepository = {
    async findRealmById(id: string): Promise<Realm | null> {
        return prisma.realm.findUnique({
            where: { id },
            include: {
                characters: true,
            },
        });
    },

    async findRealmBySlug(slug: string): Promise<Realm | null> {
        return prisma.realm.findUnique({
            where: { slug },
            include: {
                characters: true,
            },
        });
    },

    async findRealmsByUser(
        userId: string,
        params: RealmQueryParams
    ): Promise<{ realms: Realm[]; total: number }> {
        const {
            page = 1,
            limit = 20,
            search,
            rating,
            visibility,
            tags,
            isFavourite,
            sortBy = 'createdAt',
            sortOrder = 'desc',
        } = params;

        const skip = (page - 1) * limit;
        const take = limit;

        const where: Prisma.RealmWhereInput = {
            userId,
        };

        if (rating) where.rating = rating as Rating;
        if (visibility) where.visibility = visibility as Visibility;
        if (isFavourite !== undefined) where.isFavourite = isFavourite;
        if (tags && tags.length > 0) where.tags = { hasEvery: tags };

        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
            ];
        }

        const orderBy: Record<string, 'asc' | 'desc'> = {};
        orderBy[sortBy] = sortOrder;

        const [realms, total] = await Promise.all([
            prisma.realm.findMany({
                where,
                skip,
                take,
                orderBy,
                include: {
                    characters: true,
                    _count: {
                        select: { characters: true },
                    },
                },
            }),
            prisma.realm.count({ where }),
        ]);

        return { realms, total };
    },

    async createRealm(data: CreateRealmData): Promise<Realm> {
        return prisma.realm.create({
            data: {
                userId: data.userId,
                name: data.name,
                slug: data.slug,
                description: data.description,
                tags: data.tags,
                rating: data.rating,
                visibility: data.visibility,
                avatar: data.avatar ? (data.avatar as Prisma.InputJsonValue) : Prisma.JsonNull,
                characters: data.characterIds ? {
                    connect: data.characterIds.map(id => ({ id }))
                } : undefined,
            },
            include: {
                characters: true,
            },
        });
    },

    async updateRealm(id: string, data: UpdateRealmData): Promise<Realm> {
        const updateData: Prisma.RealmUpdateInput = {};

        if (data.name) updateData.name = data.name;
        if (data.slug) updateData.slug = data.slug;
        if (data.description !== undefined) updateData.description = data.description;
        if (data.tags !== undefined) updateData.tags = data.tags;
        if (data.rating) updateData.rating = data.rating;
        if (data.visibility) updateData.visibility = data.visibility;
        if (data.avatar !== undefined) {
            updateData.avatar = data.avatar ? (data.avatar as Prisma.InputJsonValue) : Prisma.JsonNull;
        }
        if (data.isFavourite !== undefined) updateData.isFavourite = data.isFavourite;

        return prisma.realm.update({
            where: { id },
            data: updateData,
            include: {
                characters: true,
            },
        });
    },

    async deleteRealm(id: string): Promise<void> {
        await prisma.realm.delete({
            where: { id },
        });
    },

    async checkSlugExists(slug: string, excludeId?: string): Promise<boolean> {
        const realm = await prisma.realm.findUnique({
            where: { slug },
            select: { id: true },
        });

        if (!realm) return false;
        if (excludeId && realm.id === excludeId) return false;
        return true;
    },
};

export default realmRepository;
