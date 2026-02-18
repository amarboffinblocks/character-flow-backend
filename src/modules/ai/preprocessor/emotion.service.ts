/**
 * Emotion Detection Service
 * Detects user emotion for tone-adaptive responses
 */

import { generateText } from 'ai';
import { getAIProvider } from '../../chat/ai/provider.js';
import { resolveModel } from '../../chat/ai/model-router.js';
import type { EmotionType } from '../ai.types.js';
import { logger } from '../../../lib/logger.js';

const VALID_EMOTIONS: EmotionType[] = [
  'happy',
  'sad',
  'angry',
  'romantic',
  'excited',
  'neutral',
];

function parseEmotion(raw: string): EmotionType {
  const normalized = raw.trim().toLowerCase().replace(/[^a-z]/g, '');
  const match = VALID_EMOTIONS.find((e) => normalized.startsWith(e) || normalized.includes(e));
  return match ?? 'neutral';
}

export async function detectEmotion(message: string): Promise<EmotionType> {
  try {
    const provider = getAIProvider('gemini');
    const model = resolveModel('gemini', 'gemini-2.5-flash');

    const { text } = await generateText({
      model: provider(model),
      prompt: `Detect the user's emotional tone in ONE word. Reply with only the word, nothing else.

Valid options: happy, sad, angry, romantic, excited, neutral

User message: "${message.slice(0, 500)}"

Emotion:`,
      temperature: 0,
      maxOutputTokens: 10,
    });

    return parseEmotion(text ?? '');
  } catch (err) {
    logger.warn({ err, message: message.slice(0, 100) }, 'Emotion detection failed, defaulting to neutral');
    return 'neutral';
  }
}
