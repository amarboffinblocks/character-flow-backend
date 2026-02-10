import { chatRepository } from './chat.repository.js';
import { modelService } from '../model/index.js';
import { modelRepository } from '../model/model.repository.js';
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
import { chatAIService, StreamChunk } from './ai/chat.ai.service.js';
import { createChatCompletion, createChatCompletionStream } from "./ai/llm.gateway.js";
import type { ChatMessage } from "./ai/llm.gateway.js";
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
  // Helper: Build conversation messages
  // ============================================

  // NEW ✅ DB is source of truth
  async buildConversationMessages(chatId: string): Promise<ChatMessage[]> {
    const { messages } = await chatRepository.findMessagesByChat(chatId, {
      limit: 0,
      sortOrder: "asc",
    });

    return messages.map((msg) => ({
      role: msg.role as "user" | "assistant" | "system",
      content: msg.content,
    }));
  },

  // ============================================
  // Send Message to LLM
  // ============================================

  async sendMessage(
    chatId: string,
    userId: string,
    input: CreateMessageInput
  ): Promise<SendMessageResponse> {

    const { model } = await this.getModelForChat(chatId, userId);
    const userRole = input.role || "user";

    const aiOptions = {
      provider: model.provider as any,
      modelName: model.modelName || undefined,
      instructions: "You are a helpful AI assistant.",
      temperature: 0.7,
    };

    // 1️⃣ Save user message first
    const savedUserMessage = await chatRepository.createMessage({
      chatId,
      role: userRole as "user" | "assistant" | "system",
      content: input.content,
      tokensUsed: null,
      metadata: null,
    });

    // 2️⃣ Build full conversation AFTER saving
    const messages = await this.buildConversationMessages(chatId);

    // ⭐⭐⭐ CORRECT CALL ⭐⭐⭐
    const result = await chatAIService.generateReply({
      ...aiOptions,
      messages,
    });

    if (!result.content) {
      throw new Error("LLM returned empty response");
    }

    // 3️⃣ Save assistant message
    const savedAssistantMessage = await chatRepository.createMessage({
      chatId,
      role: "assistant",
      content: result.content,
      tokensUsed: result.usage?.totalTokens || null,
      metadata: { provider: aiOptions.provider, modelId: model.id },
    });

    return {
      userMessage: savedUserMessage,
      assistantMessage: savedAssistantMessage,
    };
  },

  // ============================================
  // STREAM MESSAGE (SSE)
  // ============================================
  async *streamMessage(
    chatId: string,
    userId: string,
    input: CreateMessageInput
  ): AsyncGenerator<StreamChunk> {

    const { model } = await this.getModelForChat(chatId, userId);
    const userRole = input.role || "user";

    const aiOptions = {
      provider: model.provider as any,
      modelName: model.modelName || undefined,
      instructions: "You are a helpful AI assistant.",
      temperature: 0.7,
    };

    // 1️⃣ Save user message
    await chatRepository.createMessage({
      chatId,
      role: userRole as "user" | "assistant" | "system",
      content: input.content,
      tokensUsed: null,
      metadata: null,
    });

    // 2️⃣ Build conversation
    const messages = await this.buildConversationMessages(chatId);

    // ⭐⭐⭐ CORRECT STREAM ⭐⭐⭐
    const stream = chatAIService.streamReply({
      ...aiOptions,
      messages,
    });

    let fullAssistantReply = "";
    let usage: any = null;

    for await (const chunk of stream) {
      if (chunk.type === "content") {
        const content = chunk.content ?? "";
        fullAssistantReply += content;

        // 🔥 CRITICAL: Split chunk into individual characters for TRUE token-by-token streaming
        // OpenAI delta.content can contain multiple tokens (e.g., "Hello! I'm")
        // Splitting character-by-character creates ChatGPT-like smooth streaming UX
        for (let i = 0; i < content.length; i++) {
          yield { type: "content", content: content.charAt(i) };
        }
      }

      if (chunk.type === "usage") {
        usage = chunk.usage;
      }
    }

    if (!fullAssistantReply.trim()) {
      throw new Error("Stream ended with empty assistant reply");
    }

    // 3️⃣ Save assistant message
    const savedAssistantMessage = await chatRepository.createMessage({
      chatId,
      role: "assistant",
      content: fullAssistantReply,
      tokensUsed: usage?.totalTokens || null,
      metadata: { provider: aiOptions.provider, modelId: model.id },
    });

    yield {
      type: "done",
      messageId: savedAssistantMessage.id,
      usage,
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
