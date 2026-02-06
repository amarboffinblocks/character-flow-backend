import { chatRepository } from './chat.repository.js';
import { modelService } from '../model/index.js';
import { modelRepository } from '../model/model.repository.js';
import { createChatCompletion, type ChatMessage } from '../../lib/ai/agent.js';
import { prisma } from '../../lib/prisma.js';
import { createError } from '../../utils/index.js';
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
  SendMessageResponse,
  MessageListResponse,
} from './chat.types.js';

// ============================================
// Chat Service
// ============================================

export const chatService = {
  async getChatById(id: string, userId: string, options?: { includeMessages?: boolean }) {
    const chat = await chatRepository.findChatByIdAndUser(id, userId, options);
    if (!chat) {
      throw createError.notFound('Chat not found');
    }
    const { _count, ...rest } = chat;
    const chatWithCount = rest as typeof rest & { messages?: Array<{ id: string; role: string; content: string; createdAt: Date }> };
    return {
      chat: {
        ...chatWithCount,
        messageCount: _count.messages,
        ...(chatWithCount.messages && { messages: chatWithCount.messages }),
      },
    };
  },

  async getUserChats(userId: string, params: ChatQueryParams): Promise<ChatListResponse> {
    const { page = 1, limit = 20 } = params;
    const { chats, total } = await chatRepository.findChatsByUser(userId, params);
    const transformed = chats.map((c) => {
      const { _count, ...data } = c;
      return { ...data, messageCount: _count.messages };
    });
    const totalPages = limit === 0 ? 1 : Math.ceil(total / limit);
    return {
      chats: transformed,
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
    const { _count, ...rest } = chat;
    return {
      chat: { ...rest, messageCount: _count.messages },
    };
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
    const { _count, ...rest } = chat;
    return {
      chat: { ...rest, messageCount: _count.messages },
    };
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
    const { _count, ...rest } = chat;
    return {
      chat: { ...rest, messageCount: _count.messages },
    };
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
    const { _count, ...rest } = chat;
    return {
      chat: { ...rest, messageCount: _count.messages },
    };
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
    const { _count, ...rest } = newChat;
    return {
      chat: { ...rest, messageCount: _count.messages },
    };
  },

  // ============================================
  // Send Message to LLM
  // ============================================

  async sendMessage(chatId: string, userId: string, input: CreateMessageInput): Promise<SendMessageResponse> {
    // Get chat
    const chat = await chatRepository.findChatByIdAndUser(chatId, userId);
    if (!chat) {
      throw createError.notFound('Chat not found');
    }

    // Get modelId from chat or use default model
    let modelId = (chat as { modelId?: string | null }).modelId;
    let model = modelId ? await modelRepository.findModelById(modelId) : null;

    // If no model selected or model not available, use default model
    if (!modelId || !model || !model.isActive) {
      const defaultModel = await modelRepository.findDefaultModel();
      if (!defaultModel || !defaultModel.isActive) {
        throw createError.badRequest('No active model available. Please select a model or ensure a default model is configured.');
      }
      model = defaultModel;
      modelId = defaultModel.id;
    }

    // Get user message from input
    const userMessage = input.content;

    // Configure AI options from model
    const aiOptions = {
      provider: model.provider as "openai" | "gemini" | "aws" | "anthropic" | "local",
      modelName: model.modelName || "gemini-2.5-flash",
      instructions: "You are a helpful AI assistant.",
      temperature: 0.7,
    };

    // Build messages array
    const messages: ChatMessage[] = [
      {
        role: "user",
        content: userMessage,
      },
    ];

    // Call LLM
    const result = await createChatCompletion(aiOptions, messages);

    // Return response
    return {
      userMessage: {
        id: "test-user-msg",
        chatId: chatId,
        role: "user",
        content: userMessage,
        tokensUsed: null,
        metadata: null,
        createdAt: new Date(),
      },
      assistantMessage: {
        id: "test-assistant-msg",
        chatId: chatId,
        role: "assistant",
        content: result.content,
        tokensUsed: result.usage?.totalTokens || null,
        metadata: { provider: aiOptions.provider, modelId: model.id },
        createdAt: new Date(),
      },
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
