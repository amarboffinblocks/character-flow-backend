/**
 * Postprocessor Service
 * Orchestrates guardrail and humanizer on assistant output
 */

import { config } from '../../../config/index.js';
import { humanize } from './response-humanizer.service.js';
import { applyGuardrail } from './character-guardrail.service.js';

export function postprocessResponse(text: string): string {
  if (!text?.trim()) return text;

  let result = text;

  if (config.ai.postprocessingEnabled) {
    result = applyGuardrail(result);
  }

  result = humanize(result);

  return result;
}
