/**
 * Intent Detection Service
 * Classifies user message intent for context-aware response planning
 */

import { generateText } from 'ai';
import { getAIProvider } from '../../chat/ai/provider.js';
import { resolveModel } from '../../chat/ai/model-router.js';
import type { IntentType } from '../ai.types.js';
import { logger } from '../../../lib/logger.js';

const VALID_INTENTS: IntentType[] = [
  'question',
  'casual_chat',
  'romance',
  'roleplay',
  'help',
  'other',
];

function parseIntent(raw: string): IntentType {
  const normalized = raw.trim().toLowerCase().replace(/[^a-z_]/g, '');
  const match = VALID_INTENTS.find((i) => normalized.startsWith(i) || normalized.includes(i));
  return match ?? 'other';
}

export async function detectIntent(message: string): Promise<IntentType> {
  try {
    const provider = getAIProvider('aws');
    const model = resolveModel('aws', 'Qwen/Qwen2.5-7B-Instruct');

    const { text } = await generateText({
      model: provider(model),
      prompt: `Classify the user's intent in ONE word. Reply with only the word, nothing else.

Valid options: question, casual_chat, romance, roleplay, help, other

User message: "${message.slice(0, 500)}"

Intent:`,
      temperature: 0,
      maxOutputTokens: 10,
    });

    return parseIntent(text ?? '');
  } catch (err) {
    logger.warn({ err, message: message.slice(0, 100) }, 'Intent detection failed, defaulting to other');
    return 'other';
  }
}
