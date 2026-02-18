/**
 * Lorebook Service
 * Retrieves relevant lore context for character chat via keyword matching
 */

import { lorebookRepository } from '../../lorebook/lorebook.repository.js';
import type { EmotionType } from '../ai.types.js';

const MAX_ENTRIES = 5;
const MAX_CONTEXT_LENGTH = 2000;

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

function scoreEntry(
  keywords: string[],
  context: string,
  userTokens: string[]
): number {
  let score = 0;
  const lowerKeywords = keywords.map((k) => k.toLowerCase());

  for (const token of userTokens) {
    if (lowerKeywords.some((k) => k.includes(token) || token.includes(k))) {
      score += 1;
    }
  }

  return score;
}

type LorebookWithEntries = Awaited<ReturnType<typeof lorebookRepository.findLorebookById>> & {
  entries?: Array<{ keywords: string[]; context: string; isEnabled: boolean }>;
};

export async function searchLorebook(
  lorebookId: string,
  userMessage: string
): Promise<string[]> {
  const lorebook = (await lorebookRepository.findLorebookById(lorebookId)) as LorebookWithEntries | null;
  const entries = lorebook?.entries;
  if (!entries || entries.length === 0) {
    return [];
  }
  const enabledEntries = entries.filter((e) => e.isEnabled !== false);
  const userTokens = tokenize(userMessage);

  const scored = enabledEntries
    .map((entry) => ({
      ...entry,
      score: scoreEntry(entry.keywords, entry.context, userTokens),
    }))
    .filter((e) => e.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_ENTRIES);

  return scored.map((e) => e.context);
}

export function formatLoreContext(entries: string[]): string {
  if (entries.length === 0) return '';

  let result = '';
  for (const entry of entries) {
    const trimmed = entry.trim().slice(0, 500);
    if (trimmed) {
      result += (result ? '\n\n' : '') + trimmed;
    }
    if (result.length >= MAX_CONTEXT_LENGTH) break;
  }

  return result.slice(0, MAX_CONTEXT_LENGTH);
}
