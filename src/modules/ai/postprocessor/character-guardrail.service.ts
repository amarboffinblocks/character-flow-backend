/**
 * Character Guardrail Service
 * Removes AI-break phrases from assistant responses
 */

import { config } from '../../../config/index.js';

export function applyGuardrail(text: string): string {
  let result = text;

  for (const phrase of config.ai.guardrailBlockedPhrases) {
    const regex = new RegExp(
      `[^.!?]*${escapeRegex(phrase)}[^.!?]*[.!?]?`,
      'gi'
    );
    result = result.replace(regex, '').trim();
  }

  return result.replace(/\n{3,}/g, '\n\n').trim() || text;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
