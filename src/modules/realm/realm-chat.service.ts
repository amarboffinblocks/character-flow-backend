/**
 * Realm Chat Service
 * Realm-scoped chat operations. Validates realm ownership and delegates to chat repo/service.
 */

import { createError } from '../../utils/index.js';
import { realmRepository } from './realm.repository.js';
import { chatService, chatRepository } from '../chat/index.js';
import type { ChatQueryParams, MessageQueryParams } from '../chat/chat.types.js';
import type { ChatListResponse, ChatResponse, MessageListResponse } from '../chat/chat.types.js';
import type { CreateMessageInput } from '../chat/chat.types.js';
import type { SendMessageStreamResponse } from '../chat/chat.types.js';

async function ensureRealmOwnership(realmId: string, userId: string): Promise<{ id: string; userId: string }> {
  const realm = await realmRepository.findRealmById(realmId);
  if (!realm) throw createError.notFound('Realm not found');
  if (realm.userId !== userId) throw createError.forbidden('You do not own this realm');
  return { id: realm.id, userId: realm.userId };
}

export const realmChatService = {
  async listRealmChats(
    realmId: string,
    userId: string,
    params?: ChatQueryParams
  ): Promise<ChatListResponse> {
    await ensureRealmOwnership(realmId, userId);
    return chatService.getUserChats(userId, {
      ...params,
      realmId,
    });
  },

  async createRealmChat(
    realmId: string,
    userId: string,
    input?: { title?: string | null }
  ): Promise<ChatResponse> {
    await ensureRealmOwnership(realmId, userId);
    const result = await chatService.createChat(userId, {
      realmId,
      characterId: null,
      title: input?.title ?? null,
    });
    const REALM_GREETING = 'You are now in the realm. Characters may respond when you send a message.';
    await chatRepository.createMessage({
      chatId: result.chat.id,
      role: 'assistant',
      content: REALM_GREETING,
    });
    return result;
  },

  async getRealmChat(realmId: string, chatId: string, userId: string): Promise<ChatResponse> {
    await ensureRealmOwnership(realmId, userId);
    const chat = await chatRepository.findChatByIdAndUser(chatId, userId);
    if (!chat) throw createError.notFound('Chat not found');
    const chatRealmId = (chat as { realmId?: string | null }).realmId;
    if (chatRealmId !== realmId) throw createError.notFound('Chat not found in this realm');
    const { _count, ...rest } = chat as { _count: { messages: number }; [k: string]: unknown };
    return { chat: { ...rest, messageCount: _count.messages } as ChatResponse['chat'] };
  },

  async sendRealmChatMessage(
    realmId: string,
    chatId: string,
    userId: string,
    input: CreateMessageInput & { trigger?: 'regenerate' | 'edit'; messageId?: string }
  ): Promise<SendMessageStreamResponse> {
    await ensureRealmOwnership(realmId, userId);
    const chat = await chatRepository.findChatByIdAndUser(chatId, userId);
    if (!chat) throw createError.notFound('Chat not found');
    const chatRealmId = (chat as { realmId?: string | null }).realmId;
    if (chatRealmId !== realmId) throw createError.notFound('Chat not found in this realm');
    return chatService.sendMessage(chatId, userId, input);
  },

  async getRealmChatMessages(
    realmId: string,
    chatId: string,
    userId: string,
    params?: MessageQueryParams
  ): Promise<MessageListResponse> {
    await this.getRealmChat(realmId, chatId, userId);
    return chatService.getMessagesByChat(chatId, userId, params ?? {});
  },
};
