import { chatRepository } from './chat.repository.js';
import { characterRepository } from '../character/character.repository.js';
import { modelService } from '../model/index.js';
import { modelRepository } from '../model/model.repository.js';
import { parseModelConfig } from '../model/model.types.js';
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
import { addMemories, searchMemories } from '../memory/index.js';
import { runAIOrchestrator } from '../ai/orchestrator/ai-orchestrator.service.js';
import { postprocessResponse } from '../ai/postprocessor/postprocessor.service.js';

type ChatWithCount = { _count: { messages: number };[key: string]: unknown };

/** Max number of prior messages to include as context for the LLM */
const MAX_HISTORY_MESSAGES = 50;

function withMessageCount<T extends ChatWithCount>(chat: T) {
  const { _count, ...rest } = chat;
  return { ...rest, messageCount: _count.messages } as Omit<T, '_count'> & {
    messageCount: number;
  };
}

/**
 * Build all first message versions for character chat: firstMessage + alternateMessages.
 * Returns { content, versions } for storage. content is the primary (first) display.
 */
function buildFirstMessageVersions(
  firstMessage: string | null | undefined,
  alternateMessages: string[] | null | undefined
): { content: string; versions: string[] } | null {
  const first = firstMessage?.trim();
  const alternates = Array.isArray(alternateMessages)
    ? alternateMessages.filter((m): m is string => typeof m === 'string' && m.trim().length > 0)
    : [];

  const versions: string[] = [];
  if (first) versions.push(first);
  versions.push(...alternates);

  if (versions.length === 0) return null;
  return { content: versions[0]!, versions };
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
    // Chat always uses the default model
    const defaultModel = await modelRepository.findDefaultModel();
    if (!defaultModel || !defaultModel.isActive) {
      throw createError.badRequest('No active model available. Please select a model or ensure a default model is configured.');
    }
    const modelId = defaultModel.id;

    const data: CreateChatData = {
      userId,
      characterId: input.characterId ?? null,
      realmId: input.realmId ?? null,
      folderId: input.folderId ?? null,
      modelId: modelId,
      title: input.title ?? null,
    };
    const chat = await chatRepository.createChat(data);

    // Create first assistant message when chat has a character
    if (input.characterId) {
      const character = await characterRepository.findCharacterById(input.characterId);
      const firstMessageData = character
        ? buildFirstMessageVersions(character.firstMessage, character.alternateMessages)
        : null;
      if (firstMessageData) {
        await chatRepository.createMessage({
          chatId: chat.id,
          role: 'assistant',
          content: firstMessageData.content,
          metadata: { versions: firstMessageData.versions },
        });
      }
    }

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
   * Validate that the default model is available for chat
   * This should be called before sending messages to ensure a default model is configured
   */
  async validateChatHasModel(chatId: string, userId: string): Promise<void> {
    const chat = await chatRepository.findChatByIdAndUser(chatId, userId);
    if (!chat) {
      throw createError.notFound('Chat not found');
    }
    const defaultModel = await modelRepository.findDefaultModel();
    if (!defaultModel || !defaultModel.isActive) {
      throw createError.badRequest('No active model available. Please select a model from Model Selection or the chat panel.');
    }
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

    // Chat always uses the default model for sending messages
    const defaultModel = await modelRepository.findDefaultModel();
    if (!defaultModel || !defaultModel.isActive) {
      throw createError.badRequest('No active model available. Please select a model or ensure a default model is configured.');
    }

    return { chat, model: defaultModel, modelId: defaultModel.id };
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

    if (input.trigger === 'regenerate' && input.messageId) {
      return this.regenerateAssistantMessage(chatId, userId, input.messageId, {
        chat,
        model,
        provider,
      });
    }

    const hasContent = !!input.content?.trim();
    const hasAttachments = (input.attachments?.length ?? 0) > 0;
    if (!hasContent && !hasAttachments) {
      throw createError.badRequest('Message content or attachments are required');
    }

    const persistedContent = input.content?.trim() || (hasAttachments ? '[Image attached]' : '');

    const created = await chatRepository.createMessage({
      chatId,
      role: 'user',
      content: persistedContent,
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

    // Fetch most recent chat history for LLM context (then reverse to chronological order)
    const { messages: recentMessages } = await chatRepository.findMessagesByChat(chatId, {
      limit: MAX_HISTORY_MESSAGES,
      sortOrder: 'desc',
    });
    const historyMessages = [...recentMessages].reverse();
    contextMessages = historyMessages
      .filter((m) => ['user', 'assistant', 'system'].includes(m.role))
      .map((m) => ({ role: m.role as 'user' | 'assistant' | 'system', content: m.content }));

    const characterId = (chat as { characterId?: string | null })?.characterId ?? null;
    const realmId = (chat as { realmId?: string | null })?.realmId ?? null;

    // Retrieve relevant memories (multi-scope: chat + character + global)
    const memoryContext = await searchMemories({
      userId,
      chatId,
      characterId,
      query: input.content?.trim() || persistedContent,
      limit: 10,
    });

    const orchestratorResult = await runAIOrchestrator({
      chatId,
      userId,
      userMessage: input.content?.trim() ?? '',
      userAttachments: input.attachments,
      characterId,
      realmId,
      history: contextMessages,
      memoryContext: memoryContext.systemPrompt
        ? { systemPrompt: memoryContext.systemPrompt, memories: memoryContext.memories }
        : undefined,
    });

    const messages = toModelMessages(orchestratorResult.messages);
    const modelConfig = parseModelConfig(model.metadata);

    const logContext = { chatId, userId, messageId: userMessage.id };

    logger.info(
      {
        ...logContext,
        provider,
        model: model.modelName,
        messageCount: messages.length,
        characterId: characterId ?? undefined,
      },
      'Starting LLM stream'
    );

    const streamResult = streamLLM({
      provider,
      model: model.modelName ?? undefined,
      messages,
      temperature: modelConfig.temperature,
      maxTokens: modelConfig.maxTokens,
      topP: modelConfig.topP,
      frequencyPenalty: modelConfig.frequencyPenalty,
      presencePenalty: modelConfig.presencePenalty,
      logContext,

      onFinish: async ({ text }) => {
        const processed = postprocessResponse(text);
        await chatRepository.createMessage({
          chatId,
          role: 'assistant',
          content: processed,
        });
        await addMemories({
          userId,
          chatId,
          characterId,
          messages: [
            { role: 'user', content: persistedContent },
            { role: 'assistant', content: processed },
          ],
        });
      },

      onError: () => {
        // Error already logged in stream-llm with full context
      },

      onPartialSave: async ({ partialText }) => {
        const processed = postprocessResponse(partialText.trim() || '(Response was interrupted)');
        await chatRepository.createMessage({
          chatId,
          role: 'assistant',
          content: processed,
        });
      },
    });

    return {
      userMessage,
      streamResult: streamResult as SendMessageStreamResponse['streamResult'],
    };
  },

  // ============================================
  // Regenerate Assistant Message
  // ============================================

  async regenerateAssistantMessage(
    chatId: string,
    userId: string,
    assistantMessageId: string,
    ctx: { chat: ChatWithCount; model: { provider: string; modelName?: string | null; metadata?: unknown }; provider: ReturnType<typeof mapProviderToModelProvider> }
  ): Promise<SendMessageStreamResponse> {
    const { chat, model, provider } = ctx;

    const assistantMsg = await chatRepository.findMessageById(assistantMessageId);
    if (!assistantMsg) {
      throw createError.notFound('Message not found');
    }
    if (assistantMsg.chatId !== chatId) {
      throw createError.notFound('Message not found');
    }
    if (assistantMsg.role !== 'assistant') {
      throw createError.badRequest('Can only regenerate assistant messages');
    }

    const { messages: allMessages } = await chatRepository.findMessagesByChat(chatId, {
      limit: MAX_HISTORY_MESSAGES,
      sortOrder: 'asc',
    });

    const assistantIndex = allMessages.findIndex((m) => m.id === assistantMessageId);
    if (assistantIndex < 0) {
      throw createError.notFound('Message not found in chat');
    }
    if (assistantIndex === 0) {
      throw createError.badRequest('No user message to regenerate from');
    }

    const userMsg = allMessages[assistantIndex - 1];
    if (!userMsg) {
      throw createError.badRequest('User message not found');
    }
    if (userMsg.role !== 'user') {
      throw createError.badRequest('Previous message must be from user');
    }

    await chatRepository.deleteMessage(assistantMessageId);

    const contextMessages = allMessages
      .slice(0, assistantIndex)
      .filter((m) => ['user', 'assistant', 'system'].includes(m.role))
      .map((m) => ({ role: m.role as 'user' | 'assistant' | 'system', content: m.content }));

    const characterId = (chat as { characterId?: string | null })?.characterId ?? null;
    const realmId = (chat as { realmId?: string | null })?.realmId ?? null;

    const memoryContext = await searchMemories({
      userId,
      chatId,
      characterId,
      query: userMsg.content ?? '',
      limit: 10,
    });

    const orchestratorResult = await runAIOrchestrator({
      chatId,
      userId,
      userMessage: userMsg.content ?? '',
      userAttachments: [],
      characterId,
      realmId,
      history: contextMessages,
      memoryContext: memoryContext.systemPrompt
        ? { systemPrompt: memoryContext.systemPrompt, memories: memoryContext.memories }
        : undefined,
    });

    const messages = toModelMessages(orchestratorResult.messages);
    const modelConfig = parseModelConfig(model.metadata);
    const logContext = { chatId, userId, messageId: userMsg.id };

    logger.info(
      {
        ...logContext,
        provider: model.provider,
        model: model.modelName,
        messageCount: messages.length,
        characterId: characterId ?? undefined,
      },
      'Regenerating assistant message'
    );

    const streamResult = streamLLM({
      provider,
      model: model.modelName ?? undefined,
      messages,
      temperature: modelConfig.temperature,
      maxTokens: modelConfig.maxTokens,
      topP: modelConfig.topP,
      frequencyPenalty: modelConfig.frequencyPenalty,
      presencePenalty: modelConfig.presencePenalty,
      logContext,

      onFinish: async ({ text }) => {
        const processed = postprocessResponse(text);
        await chatRepository.createMessage({
          chatId,
          role: 'assistant',
          content: processed,
        });
        await addMemories({
          userId,
          chatId,
          characterId,
          messages: [
            { role: 'user', content: userMsg.content ?? '' },
            { role: 'assistant', content: processed },
          ],
        });
      },

      onError: () => {
        // Error already logged in stream-llm
      },

      onPartialSave: async ({ partialText }) => {
        const processed = postprocessResponse(partialText.trim() || '(Response was interrupted)');
        await chatRepository.createMessage({
          chatId,
          role: 'assistant',
          content: processed,
        });
      },
    });

    const userMessage = {
      id: userMsg.id,
      chatId,
      role: userMsg.role,
      content: userMsg.content ?? '',
      tokensUsed: userMsg.tokensUsed ?? null,
      metadata: userMsg.metadata ?? null,
      createdAt: userMsg.createdAt,
    };

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
