/**
 * Preprocessor Service
 * Orchestrates intent, emotion, and safety checks
 */

import { config } from '../../../config/index.js';
import { detectEmotion } from './emotion.service.js';
import { detectIntent } from './intent.service.js';
import { safetyCheck } from './safety.service.js';
import type { PreprocessResult } from '../ai.types.js';

export async function preprocessMessage(message: string): Promise<PreprocessResult> {
  const isSafe = safetyCheck(message);

  if (!config.ai.preprocessingEnabled) {
    return {
      emotion: 'neutral',
      intent: 'other',
      isSafe,
      rawMessage: message,
    };
  }

  const [emotion, intent] = await Promise.all([
    detectEmotion(message),
    detectIntent(message),
  ]);

  return {
    emotion,
    intent,
    isSafe,
    rawMessage: message,
  };
}
