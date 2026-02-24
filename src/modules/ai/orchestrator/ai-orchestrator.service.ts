/**
 * AI Orchestrator Service
 * Main pipeline: preprocess → character context → plan → build messages
 */

import { createError } from '../../../utils/index.js';
import { characterRepository } from '../../character/character.repository.js';
import { preprocessMessage } from '../preprocessor/preprocessor.service.js';
import { buildCharacterContext } from '../character/character-context.service.js';
import { planResponse } from '../prompt-planner/prompt-planner.service.js';
import { buildFinalMessages } from '../prompt-builder/final-prompt.builder.js';
import type {
  AIOrchestratorInput,
  AIOrchestratorResult,
  ChatMessage,
} from '../ai.types.js';

const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_MAX_TOKENS = 1024;

export async function runAIOrchestrator(
  input: AIOrchestratorInput
): Promise<AIOrchestratorResult> {
  const { userMessage, characterId, history, memoryContext } = input;

  const preprocess = await preprocessMessage(userMessage);

  if (!preprocess.isSafe) {
    throw createError.badRequest(
      'Your message could not be processed. Please rephrase and try again.'
    );
  }

  if (!characterId) {
    return buildSimpleChatResult(input, preprocess);
  }

  return buildCharacterChatResult(input, preprocess);
}

async function buildSimpleChatResult(
  input: AIOrchestratorInput,
  preprocess: Awaited<ReturnType<typeof preprocessMessage>>
): Promise<AIOrchestratorResult> {
  const { history, userMessage, userAttachments, memoryContext } = input;

  const systemParts: string[] = [];

  if (memoryContext?.systemPrompt?.trim()) {
    systemParts.push(memoryContext.systemPrompt);
  }

  systemParts.push(
    'You are a helpful, friendly AI assistant. Be concise and natural.'
  );

  const plan = planResponse(preprocess.emotion, preprocess.intent);

  const messages = buildFinalMessages({
    systemPrompt: systemParts.join('\n\n'),
    toneInstruction: plan.toneInstruction,
    memoryPrompt: undefined,
    loreContext: undefined,
    history,
    userMessage,
    userAttachments,
  });

  return {
    messages,
    temperature: plan.temperature,
    maxTokens: plan.maxTokens,
    preprocess,
    responsePlan: plan,
  };
}

type CharacterWithRelations = Awaited<ReturnType<typeof characterRepository.findCharacterById>> & {
  persona?: { id: string; name: string; description?: string | null } | null;
  lorebook?: { id: string; name: string; entries?: Array<{ keywords: string[]; context: string; isEnabled: boolean }> } | null;
};

async function buildCharacterChatResult(
  input: AIOrchestratorInput,
  preprocess: Awaited<ReturnType<typeof preprocessMessage>>
): Promise<AIOrchestratorResult> {
  const { characterId, history, userMessage, userAttachments, memoryContext } = input;

  if (!characterId) throw createError.badRequest('Character ID is required');

  const character = (await characterRepository.findCharacterById(characterId)) as CharacterWithRelations | null;
  if (!character) {
    throw createError.notFound('Character not found');
  }

  const characterContext = await buildCharacterContext({
    characterId,
    character: {
      id: character.id,
      name: character.name,
      description: character.description,
      scenario: character.scenario,
      summary: character.summary,
      firstMessage: character.firstMessage,
      alternateMessages: character.alternateMessages ?? [],
      exampleDialogues: character.exampleDialogues ?? [],
      authorNotes: character.authorNotes,
      characterNotes: character.characterNotes,
      persona: character.persona
        ? {
            id: character.persona.id,
            name: character.persona.name,
            description: character.persona.description,
          }
        : null,
      lorebook: character.lorebook
        ? {
            id: character.lorebook.id,
            name: character.lorebook.name,
            entries: character.lorebook.entries,
          }
        : null,
    },
    userMessage,
    emotion: preprocess.emotion,
    intent: preprocess.intent,
  });

  const plan = planResponse(preprocess.emotion, preprocess.intent);

  const messages = buildFinalMessages({
    systemPrompt: characterContext.systemPrompt,
    toneInstruction: plan.toneInstruction,
    memoryPrompt: memoryContext?.systemPrompt,
    loreContext: characterContext.loreContext || undefined,
    history,
    userMessage,
    userAttachments,
  });

  return {
    messages,
    temperature: plan.temperature,
    maxTokens: plan.maxTokens,
    preprocess,
    characterContext,
    responsePlan: plan,
  };
}
