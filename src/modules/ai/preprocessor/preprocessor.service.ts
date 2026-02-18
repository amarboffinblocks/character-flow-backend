import { detectEmotion } from './emotion.service.js';
import { detectIntent } from './intent.service.js';
import { safetyCheck } from './safety.service.js';
import { PreprocessResult } from '../ai.types.js';

export async function preprocessMessage(
  message: string
): Promise<PreprocessResult> {
  const [emotion, intent, isSafe] = await Promise.all([
    detectEmotion(message),
    detectIntent(message),
    safetyCheck(message),
  ]);

  return { emotion, intent, isSafe };
}