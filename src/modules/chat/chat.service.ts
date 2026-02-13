import { chatRepository } from './chat.repository.js';
import { modelService } from '../model/index.js';
import { modelRepository } from '../model/model.repository.js';
import { createError } from '../../utils/index.js';
import { logger } from '../../lib/logger.js';
import type {
  CreateChatInput,
  UpdateChatInput,
  ChatQueryParams,
  ChatResponse,
  ChatListResponse,
  MessageResponse,
  CreateChatData,
  UpdateChatData,
  CreateMessageInput,
  MessageQueryParams,
  MessageListResponse,
  SendMessageStreamResponse,
} from './chat.types.js';
import { streamLLM } from './ai/stream-llm.js';
import { mapProviderToModelProvider } from './ai/model-router.js';
import { toModelMessages } from './ai/message-converter.js';

type ChatWithCount = { _count: { messages: number }; [key: string]: unknown };

function withMessageCount<T extends ChatWithCount>(chat: T) {
  const { _count, ...rest } = chat;
  return { ...rest, messageCount: _count.messages } as Omit<T, '_count'> & {
    messageCount: number;
  };
}

export const chatService = {
  async getChatById(id: string, userId: string, options?: { includeMessages?: boolean }) {
    const chat = await chatRepository.findChatByIdAndUser(id, userId, options);
    if (!chat) throw createError.notFound('Chat not found');
    return { chat: withMessageCount(chat) };
  },

  async getUserChats(userId: string, params: ChatQueryParams): Promise<ChatListResponse> {
    const { page = 1, limit = 20 } = params;
    const { chats, total } = await chatRepository.findChatsByUser(userId, params);
    const totalPages = limit === 0 ? 1 : Math.ceil(total / limit);
    return {
      chats: chats.map(withMessageCount),
      pagination: { page, limit, total, totalPages },
    };
  },

  async createChat(userId: string, input: CreateChatInput): Promise<ChatResponse> {
    // Validate model if provided, otherwise use default model
    let modelId = input.modelId;

    if (modelId) {
      await modelService.validateModelExists(modelId);
    } else {
      // Use default model if no modelId provided
      const defaultModel = await modelRepository.findDefaultModel();
      if (!defaultModel || !defaultModel.isActive) {
        throw createError.badRequest('No active model available. Please select a model or ensure a default model is configured.');
      }
      modelId = defaultModel.id;
    }

    const data: CreateChatData = {
      userId,
      characterId: input.characterId ?? null,
      realmId: input.realmId ?? null,
      folderId: input.folderId ?? null,
      modelId: modelId,
      title: input.title ?? null,
    };
    const chat = await chatRepository.createChat(data);
    return { chat: withMessageCount(chat) };
  },

  async updateChat(id: string, userId: string, input: UpdateChatInput): Promise<ChatResponse> {
    const existing = await chatRepository.findChatByIdAndUser(id, userId);
    if (!existing) {
      throw createError.notFound('Chat not found');
    }

    // Validate model if it's being updated
    if (input.modelId !== null && input.modelId !== undefined) {
      await modelService.validateModelExists(input.modelId);
    }

    const updateData: UpdateChatData = {
      title: input.title,
      folderId: input.folderId,
      modelId: input.modelId,
    };
    const chat = await chatRepository.updateChat(id, updateData);
    return { chat: withMessageCount(chat) };
  },

  async deleteChat(id: string, userId: string): Promise<MessageResponse> {
    const existing = await chatRepository.findChatByIdAndUser(id, userId);
    if (!existing) {
      throw createError.notFound('Chat not found');
    }
    await chatRepository.deleteChat(id);
    return { message: 'Chat deleted successfully' };
  },

  /**
   * Validate that a chat has a model selected
   * This should be called before sending messages to ensure a model is selected
   */
  async validateChatHasModel(chatId: string, userId: string): Promise<void> {
    const chat = await chatRepository.findChatByIdAndUser(chatId, userId);
    if (!chat) {
      throw createError.notFound('Chat not found');
    }
    const modelId = (chat as { modelId?: string | null }).modelId;
    if (!modelId) {
      throw createError.badRequest('A model must be selected before sending messages. Please select a model for this chat.');
    }
    // Also validate that the model exists and is active
    await modelService.validateModelExists(modelId);
  },

  // ============================================
  // Archive Chat
  // ============================================

  async archiveChat(id: string, userId: string): Promise<ChatResponse> {
    const existing = await chatRepository.findChatByIdAndUser(id, userId);
    if (!existing) {
      throw createError.notFound('Chat not found');
    }
    const chat = await chatRepository.toggleArchive(id, !existing.isActive);
    return { chat: withMessageCount(chat) };
  },

  // ============================================
  // Pin Chat
  // ============================================

  async pinChat(id: string, userId: string): Promise<ChatResponse> {
    const existing = await chatRepository.findChatByIdAndUser(id, userId);
    if (!existing) {
      throw createError.notFound('Chat not found');
    }
    const chat = await chatRepository.togglePin(id, !existing.isPinned);
    return { chat: withMessageCount(chat) };
  },

  // ============================================
  // Duplicate Chat
  // ============================================

  async duplicateChat(id: string, userId: string): Promise<ChatResponse> {
    const existing = await chatRepository.findChatByIdAndUser(id, userId, { includeMessages: true });
    if (!existing) {
      throw createError.notFound('Chat not found');
    }

    // Get messages if they exist
    const messages = (existing as { messages?: Array<{ role: string; content: string; tokensUsed?: number | null; metadata?: unknown }> }).messages || [];

    // Create new chat with same data but new title
    const existingChat = existing as unknown as { characterId: string | null; realmId: string | null; folderId: string | null; modelId: string | null; title: string | null };
    const newTitle = existingChat.title ? `${existingChat.title} (Copy)` : 'Chat (Copy)';
    const newChatData: CreateChatData = {
      userId,
      characterId: existingChat.characterId,
      realmId: existingChat.realmId,
      folderId: existingChat.folderId,
      modelId: existingChat.modelId,
      title: newTitle,
    };

    const newChat = await chatRepository.createChatWithMessages(newChatData, messages);
    return { chat: withMessageCount(newChat) };
  },

  // ============================================
  // Helper: Get and validate model for chat
  // ============================================

  async getModelForChat(chatId: string, userId: string) {
    const chat = await chatRepository.findChatByIdAndUser(chatId, userId);
    if (!chat) {
      throw createError.notFound('Chat not found');
    }

    let modelId = (chat as { modelId?: string | null }).modelId;
    let model = modelId ? await modelRepository.findModelById(modelId) : null;

    if (!modelId || !model || !model.isActive) {
      const defaultModel = await modelRepository.findDefaultModel();
      if (!defaultModel || !defaultModel.isActive) {
        throw createError.badRequest('No active model available. Please select a model or ensure a default model is configured.');
      }
      model = defaultModel;
      modelId = defaultModel.id;
    }

    return { chat, model, modelId };
  },

  // ============================================
  // Send Message to LLM
  // ============================================

  async sendMessage(
    chatId: string,
    userId: string,
    input: CreateMessageInput & { trigger?: 'regenerate'; messageId?: string }
  ): Promise<SendMessageStreamResponse> {
    const { chat, model } = await this.getModelForChat(chatId, userId);
    const provider = mapProviderToModelProvider(model.provider);

    let userMessage: SendMessageStreamResponse['userMessage'];
    let contextMessages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;

    // Simple live chat: no history, only current user message
    if (input.trigger === 'regenerate') {
      throw createError.badRequest('Regenerate is not supported in simple chat mode');
    }
    if (!input.content?.trim()) {
      throw createError.badRequest('Message content is required');
    }
    const created = await chatRepository.createMessage({
      chatId,
      role: 'user',
      content: input.content,
    });
    userMessage = {
      id: created.id,
      chatId: created.chatId,
      role: created.role,
      content: created.content,
      tokensUsed: created.tokensUsed ?? null,
      metadata: created.metadata ?? null,
      createdAt: created.createdAt,
    };
    contextMessages = [{ role: 'user' as const, content: input.content }];

    const messages = toModelMessages(contextMessages);

    const logContext = { chatId, userId, messageId: userMessage.id };

    logger.info(
      { ...logContext, provider, model: model.modelName, messageCount: messages.length },
      'Starting LLM stream'
    );

    const streamResult = streamLLM({
      provider,
      model: model.modelName ?? undefined,
      messages,
      logContext,

      onFinish: async ({ text }) => {
        await chatRepository.createMessage({
          chatId,
          role: 'assistant',
          content: text,
        });
      },

      onError: () => {
        // Error already logged in stream-llm with full context
      },

      onPartialSave: async ({ partialText }) => {
        await chatRepository.createMessage({
          chatId,
          role: 'assistant',
          content: partialText.trim() || '(Response was interrupted)',
        });
      },
    });

    return {
      userMessage,
      streamResult: streamResult as SendMessageStreamResponse['streamResult'],
    };
  },

  // ============================================
  // Get Messages By Chat
  // ============================================

  async getMessagesByChat(chatId: string, userId: string, params: MessageQueryParams): Promise<MessageListResponse> {
    // Verify chat belongs to user
    const chat = await chatRepository.findChatByIdAndUser(chatId, userId);
    if (!chat) {
      throw createError.notFound('Chat not found');
    }

    const { page = 1, limit = 20 } = params;
    const { messages, total } = await chatRepository.findMessagesByChat(chatId, params);
    const totalPages = limit === 0 ? 1 : Math.ceil(total / limit);

    return {
      messages,
      pagination: { page, limit, total, totalPages },
    };
  },
};
