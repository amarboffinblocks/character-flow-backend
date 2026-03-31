/**
 * Character Guardrail Service
 * Removes AI-break phrases from assistant responses
 */

import { config } from '../../../config/index.js';

const DEFAULT_BLOCKED_PATTERNS = [
  /\bas an ai\b/gi,
  /\bi (am|was) (an|a) (ai|language model)\b/gi,
  /\bi cannot (roleplay|comply|help with that) because\b/gi,
  /\bi do not have (feelings|emotions)\b/gi,
];

export function applyGuardrail(text: string): string {
  let result = text;

  for (const phrase of config.ai.guardrailBlockedPhrases) {
    const regex = new RegExp(
      `[^.!?]*${escapeRegex(phrase)}[^.!?]*[.!?]?`,
      'gi'
    );
    result = result.replace(regex, '').trim();
  }

  for (const pattern of DEFAULT_BLOCKED_PATTERNS) {
    result = result.replace(pattern, '').trim();
  }

  return result.replace(/\n{3,}/g, '\n\n').trim() || text;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
