/**
 * AI Module Types
 * Central type definitions for the character AI pipeline
 */

// ============================================
// Preprocessing
// ============================================

export type EmotionType =
  | 'happy'
  | 'sad'
  | 'angry'
  | 'romantic'
  | 'excited'
  | 'neutral';

export type IntentType =
  | 'question'
  | 'casual_chat'
  | 'romance'
  | 'roleplay'
  | 'help'
  | 'other';

export interface PreprocessResult {
  emotion: EmotionType;
  intent: IntentType;
  isSafe: boolean;
  rawMessage: string;
}

// ============================================
// Character Context
// ============================================

export interface CharacterContextInput {
  characterId: string;
  character: {
    id: string;
    name: string;
    description?: string | null;
    scenario?: string | null;
    summary?: string | null;
    firstMessage?: string | null;
    alternateMessages?: string[];
    exampleDialogues?: string[];
    authorNotes?: string | null;
    characterNotes?: string | null;
    persona?: {
      id: string;
      name: string;
      description?: string | null;
    } | null;
    lorebook?: {
      id: string;
      name: string;
      entries?: Array<{ keywords: string[]; context: string; isEnabled: boolean }>;
    } | null;
  };
  userMessage: string;
  emotion: EmotionType;
  intent: IntentType;
}

export interface CharacterContext {
  systemPrompt: string;
  loreContext: string;
}

// ============================================
// Prompt Planning
// ============================================

export interface ResponsePlan {
  temperature: number;
  maxTokens: number;
  toneInstruction: string;
}

// ============================================
// Prompt Building
// ============================================

export type ChatMessageContent =
  | string
  | Array<
      | { type: 'text'; text: string }
      | { type: 'image'; image: string; mediaType?: string }
    >;

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: ChatMessageContent;
}

export type UserAttachment = {
  type: 'file';
  url: string;
  mediaType?: string;
  filename?: string;
};

export interface BuildMessagesInput {
  systemPrompt: string;
  toneInstruction?: string;
  memoryPrompt?: string;
  loreContext?: string;
  history: ChatMessage[];
  userMessage: string;
  userAttachments?: UserAttachment[];
}

// ============================================
// Pipeline Orchestration
// ============================================

export interface AIOrchestratorInput {
  chatId: string;
  userId: string;
  userMessage: string;
  userAttachments?: UserAttachment[];
  characterId: string | null;
  realmId: string | null;
  history: ChatMessage[];
  memoryContext?: { systemPrompt: string; memories?: unknown[] };
}

export interface AIOrchestratorResult {
  messages: ChatMessage[];
  temperature: number;
  maxTokens: number;
  preprocess?: PreprocessResult;
  characterContext?: CharacterContext;
  responsePlan?: ResponsePlan;
}
