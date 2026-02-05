import { prisma } from '../../lib/prisma.js';

// Base Chat type
export type Chat = NonNullable<Awaited<ReturnType<typeof prisma.chat.findFirst<{}>>>>;

export type ChatWithMessages = Chat & { messages: Array<{ id: string; role: string; content: string; createdAt: Date }> };

// ============================================
// Request/Response DTOs
// ============================================

export interface CreateChatInput {
  characterId?: string | null;
  realmId?: string | null;
  folderId?: string | null;
  modelId: string; // User-selected AI model for this chat (required for model switching)
  title?: string | null;
}

export interface UpdateChatInput {
  title?: string | null;
  folderId?: string | null;
  modelId?: string | null; // Allow switching model for existing chat
}

export interface ChatQueryParams {
  page?: number;
  limit?: number;
  characterId?: string;
  realmId?: string;
  folderId?: string;
  sortBy?: 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

export interface ChatResponse {
  chat: Chat & { messageCount?: number };
}

export interface ChatListResponse {
  chats: (Chat & { messageCount?: number })[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface MessageResponse {
  message: string;
}

export interface CreateChatData {
  userId: string;
  characterId?: string | null;
  realmId?: string | null;
  folderId?: string | null;
  modelId: string | null;
  title?: string | null;
}

export interface UpdateChatData {
  title?: string | null;
  folderId?: string | null;
  modelId?: string | null;
}

// ============================================
// Message Types
// ============================================

export interface CreateMessageInput {
  content: string;
  role?: 'user' | 'assistant' | 'system';
}

export interface MessageQueryParams {
  page?: number;
  limit?: number;
  role?: 'user' | 'assistant' | 'system';
  sortBy?: 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface SendMessageResponse {
  userMessage: {
    id: string;
    chatId: string;
    role: string;
    content: string;
    tokensUsed: number | null;
    metadata: unknown;
    createdAt: Date;
  };
  assistantMessage: {
    id: string;
    chatId: string;
    role: string;
    content: string;
    tokensUsed: number | null;
    metadata: unknown;
    createdAt: Date;
  };
}

export interface MessageListResponse {
  messages: Array<{
    id: string;
    chatId: string;
    role: string;
    content: string;
    tokensUsed: number | null;
    metadata: unknown;
    createdAt: Date;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
