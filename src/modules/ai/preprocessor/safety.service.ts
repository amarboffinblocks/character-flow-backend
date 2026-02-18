/**
 * Safety Check Service
 * Blocks messages containing harmful or prohibited content
 */

import { config } from '../../../config/index.js';

export function safetyCheck(message: string): boolean {
  const blocked = config.ai.safetyBlockedWords;
  const lower = message.toLowerCase();

  for (const word of blocked) {
    if (lower.includes(word)) {
      return false;
    }
  }

  return true;
}
