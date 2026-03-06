import { realmRepository } from './realm.repository.js';
import { generateSlug } from '../../utils/helpers.js';
import { createError } from '../../utils/index.js';
import {
    transformEntityImageUrls,
    transformEntitiesImageUrls,
} from '../../lib/s3.service.js';
import type {
    CreateRealmInput,
    UpdateRealmInput,
    RealmQueryParams,
    RealmResponse,
    RealmListResponse,
    MessageResponse,
    CreateRealmData,
    UpdateRealmData,
} from './realm.types.js';

export const realmService = {
    async createRealm(userId: string, input: CreateRealmInput): Promise<RealmResponse> {
        let slug = generateSlug(input.name);
        let attempts = 0;
        const maxAttempts = 10;

        while (await realmRepository.checkSlugExists(slug)) {
            attempts++;
            if (attempts >= maxAttempts) {
                throw createError.internal('Failed to generate unique slug');
            }
            slug = generateSlug(input.name);
        }

        const realmData: CreateRealmData = {
            userId,
            name: input.name,
            slug,
            description: input.description ?? null,
            tags: input.tags ?? [],
            rating: input.rating ?? 'SFW',
            visibility: input.visibility ?? 'private',
            avatar: input.avatar ?? null,
            characterIds: input.characterIds,
        };

        const realm = await realmRepository.createRealm(realmData);
        const transformedRealm = await transformEntityImageUrls(realm) as any;
        if (transformedRealm.characters) {
            transformedRealm.characters = await transformEntitiesImageUrls(transformedRealm.characters);
        }
        return { realm: transformedRealm };
    },

    async getRealmById(id: string, userId: string): Promise<RealmResponse> {
        const realm = await realmRepository.findRealmById(id);
        if (!realm) throw createError.notFound('Realm not found');
        if (realm.visibility === 'private' && realm.userId !== userId) {
            throw createError.forbidden('Realm is private');
        }
        return { realm };
    },

    async getUserRealms(userId: string, params: RealmQueryParams): Promise<RealmListResponse> {
        const { realms, total } = await realmRepository.findRealmsByUser(userId, params);
        const page = params.page ?? 1;
        const limit = params.limit ?? 20;
        const totalPages = Math.ceil(total / limit);

        const transformedRealms = await Promise.all(realms.map(async (realm: any) => {
            const transformed = await transformEntityImageUrls(realm) as any;
            if (transformed.characters) {
                transformed.characters = await transformEntitiesImageUrls(transformed.characters);
            }
            return transformed;
        }));

        return {
            realms: transformedRealms,
            pagination: {
                page,
                limit,
                total,
                totalPages,
            },
        };
    },

    async updateRealm(id: string, userId: string, input: UpdateRealmInput): Promise<RealmResponse> {
        const existingRealm = await realmRepository.findRealmById(id);
        if (!existingRealm) throw createError.notFound('Realm not found');
        if (existingRealm.userId !== userId) {
            throw createError.forbidden('You do not have permission to update this realm');
        }

        let slug: string | undefined;
        if (input.name && input.name !== existingRealm.name) {
            slug = generateSlug(input.name);
            while (await realmRepository.checkSlugExists(slug, id)) {
                slug = generateSlug(input.name);
            }
        }

        const updateData: UpdateRealmData = {
            ...(input.name && { name: input.name }),
            ...(slug && { slug }),
            ...(input.description !== undefined && { description: input.description }),
            ...(input.tags !== undefined && { tags: input.tags }),
            ...(input.rating && { rating: input.rating }),
            ...(input.visibility && { visibility: input.visibility }),
            ...(input.avatar !== undefined && { avatar: input.avatar }),
            ...(input.isFavourite !== undefined && { isFavourite: input.isFavourite }),
            ...(input.characterIds !== undefined && { characterIds: input.characterIds }),
        };

        const realm = await realmRepository.updateRealm(id, updateData);
        const transformedRealm = await transformEntityImageUrls(realm) as any;
        if (transformedRealm.characters) {
            transformedRealm.characters = await transformEntitiesImageUrls(transformedRealm.characters);
        }
        return { realm: transformedRealm };
    },

    async deleteRealm(id: string, userId: string): Promise<MessageResponse> {
        const realm = await realmRepository.findRealmById(id);
        if (!realm) throw createError.notFound('Realm not found');
        if (realm.userId !== userId) {
            throw createError.forbidden('You do not have permission to delete this realm');
        }

        await realmRepository.deleteRealm(id);
        return { message: 'Realm deleted successfully' };
    },
};

export default realmService;
