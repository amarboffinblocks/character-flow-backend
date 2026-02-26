import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import type { Chat, CreateChatData, UpdateChatData, ChatQueryParams } from './chat.types.js';

// ============================================
// Chat Repository
// ============================================

export const chatRepository = {
  async findChatById(id: string, options?: { includeMessages?: boolean }): Promise<Chat | (Chat & { messages: Array<{ id: string; role: string; content: string; createdAt: Date }> }) | null> {
    return prisma.chat.findUnique({
      where: { id },
      include: {
        character: { select: { id: true, name: true, avatar: true } },
        ...(options?.includeMessages
          ? { messages: { orderBy: { createdAt: 'asc' } } }
          : {}),
      },
    }) as Promise<Chat | (Chat & { messages: Array<{ id: string; role: string; content: string; createdAt: Date }> }) | null>;
  },

  async findChatByIdAndUser(
    id: string,
    userId: string,
    options?: { includeMessages?: boolean }
  ): Promise<(Chat & { _count: { messages: number } }) | (Chat & { _count: { messages: number }; messages: Array<{ id: string; role: string; content: string; createdAt: Date }> }) | null> {
    return prisma.chat.findFirst({
      where: { id, userId },
      include: {
        character: { select: { id: true, name: true, avatar: true } },
        _count: { select: { messages: true } },
        ...(options?.includeMessages ? { messages: { orderBy: { createdAt: 'asc' } } } : {}),
      },
    }) as Promise<(Chat & { _count: { messages: number } }) | (Chat & { _count: { messages: number }; messages: Array<{ id: string; role: string; content: string; createdAt: Date }> }) | null>;
  },

  async findChatsByUser(
    userId: string,
    params: ChatQueryParams
  ): Promise<{ chats: (Chat & { _count: { messages: number } })[]; total: number }> {
    const {
      page = 1,
      limit = 20,
      characterId,
      realmId,
      folderId,
      sortBy = 'updatedAt',
      sortOrder = 'desc',
    } = params;

    const skip = limit === 0 ? undefined : (page - 1) * limit;
    const take = limit === 0 ? undefined : limit;

    const where: {
      userId: string;
      characterId?: string | null;
      realmId?: string | null;
      folderId?: string | null;
    } = { userId };
    if (characterId !== undefined) where.characterId = characterId;
    if (realmId !== undefined) where.realmId = realmId;
    if (folderId !== undefined) where.folderId = folderId;

    const orderBy = { [sortBy]: sortOrder } as { createdAt?: 'asc' | 'desc'; updatedAt?: 'asc' | 'desc' };

    const [chats, total] = await Promise.all([
      prisma.chat.findMany({
        where,
        ...(skip !== undefined && { skip }),
        ...(take !== undefined && { take }),
        orderBy,
        include: {
          character: { select: { id: true, name: true, avatar: true } },
          _count: { select: { messages: true } },
        },
      }),
      prisma.chat.count({ where }),
    ]);

    return { chats, total };
  },

  async createChat(data: CreateChatData): Promise<Chat & { _count: { messages: number } }> {
    const createPayload = {
      userId: data.userId,
      characterId: data.characterId ?? undefined,
      realmId: data.realmId ?? undefined,
      folderId: data.folderId ?? undefined,
      modelId: data.modelId ?? undefined,
      title: data.title ?? undefined,
    } as Prisma.ChatUncheckedCreateInput;
    const chat = await prisma.chat.create({
      data: createPayload,
      include: {
        _count: { select: { messages: true } },
      },
    });
    return chat as Chat & { _count: { messages: number } };
  },

  async updateChat(id: string, data: UpdateChatData): Promise<Chat & { _count: { messages: number } }> {
    const updatePayload = {
      title: data.title ?? undefined,
      folderId: data.folderId ?? undefined,
      modelId: data.modelId ?? undefined,
    } as Prisma.ChatUncheckedUpdateInput;
    const chat = await prisma.chat.update({
      where: { id },
      data: updatePayload,
      include: {
        character: { select: { id: true, name: true, avatar: true } },
        _count: { select: { messages: true } },
      },
    });
    return chat as Chat & { _count: { messages: number } };
  },

  async deleteChat(id: string): Promise<void> {
    await prisma.chat.delete({ where: { id } });
  },

  async toggleArchive(id: string, isActive: boolean): Promise<Chat & { _count: { messages: number } }> {
    const chat = await prisma.chat.update({
      where: { id },
      data: { isActive },
      include: {
        character: { select: { id: true, name: true, avatar: true } },
        _count: { select: { messages: true } },
      },
    });
    return chat as Chat & { _count: { messages: number } };
  },

  async togglePin(id: string, isPinned: boolean): Promise<Chat & { _count: { messages: number } }> {
    const chat = await prisma.chat.update({
      where: { id },
      data: { isPinned },
      include: {
        character: { select: { id: true, name: true, avatar: true } },
        _count: { select: { messages: true } },
      },
    });
    return chat as Chat & { _count: { messages: number } };
  },

  async createChatWithMessages(
    data: CreateChatData,
    messages: Array<{ role: string; content: string; tokensUsed?: number | null; metadata?: unknown }>
  ): Promise<Chat & { _count: { messages: number } }> {
    const createPayload = {
      userId: data.userId,
      characterId: data.characterId ?? undefined,
      realmId: data.realmId ?? undefined,
      folderId: data.folderId ?? undefined,
      modelId: data.modelId ?? undefined,
      title: data.title ?? undefined,
      messages: {
        create: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
          tokensUsed: msg.tokensUsed ?? undefined,
          metadata: msg.metadata ? (msg.metadata as Prisma.InputJsonValue) : undefined,
        })),
      },
    } as Prisma.ChatUncheckedCreateInput;

    const chat = await prisma.chat.create({
      data: createPayload,
      include: {
        _count: { select: { messages: true } },
      },
    });
    return chat as Chat & { _count: { messages: number } };
  },

  // ============================================
  // Message Repository Methods
  // ============================================

  async createMessage(data: {
    chatId: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    tokensUsed?: number | null;
    metadata?: unknown;
  }) {
    return prisma.message.create({
      data: {
        chatId: data.chatId,
        role: data.role,
        content: data.content,
        tokensUsed: data.tokensUsed ?? undefined,
        metadata: data.metadata ? (data.metadata as Prisma.InputJsonValue) : undefined,
      },
    });
  },

  async findMessagesByChat(
    chatId: string,
    params: {
      page?: number;
      limit?: number;
      role?: 'user' | 'assistant' | 'system';
      sortBy?: 'createdAt';
      sortOrder?: 'asc' | 'desc';
    }
  ) {
    const {
      page = 1,
      limit = 20,
      role,
      sortBy = 'createdAt',
      sortOrder = 'asc',
    } = params;

    const skip = limit === 0 ? undefined : (page - 1) * limit;
    const take = limit === 0 ? undefined : limit;

    const where: {
      chatId: string;
      role?: string;
    } = { chatId };
    if (role) where.role = role;

    const orderBy = { [sortBy]: sortOrder } as { createdAt: 'asc' | 'desc' };

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where,
        ...(skip !== undefined && { skip }),
        ...(take !== undefined && { take }),
        orderBy,
      }),
      prisma.message.count({ where }),
    ]);

    return { messages, total };
  },

  async findMessageById(id: string, chatId?: string) {
    const where: { id: string; chatId?: string } = { id };
    if (chatId) where.chatId = chatId;
    return prisma.message.findFirst({ where });
  },

  async deleteMessage(id: string) {
    await prisma.message.delete({ where: { id } });
  },
};
