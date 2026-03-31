/**
 * Character Context Service
 * Builds system prompt and lore context for character-based chat
 */

import { searchLorebook, formatLoreContext } from './lorebook.service.js';
import { buildCharacterSystemPrompt } from './system-prompt.builder.js';
import type { CharacterContext, CharacterContextInput } from '../ai.types.js';

export async function buildCharacterContext(
  input: CharacterContextInput
): Promise<CharacterContext> {
  const { character, userMessage, emotion } = input;

  const personality = [
    character.summary?.trim(),
    character.persona?.description?.trim(),
  ]
    .filter(Boolean)
    .join('\n\n') || 'A unique character with distinct personality.';

  const systemPrompt = buildCharacterSystemPrompt({
    name: character.name,
    description: character.description,
    scenario: character.scenario,
    personality,
    firstMessage: character.firstMessage,
    exampleDialogues: character.exampleDialogues,
    authorNotes: character.authorNotes,
    characterNotes: character.characterNotes,
    emotion,
    intent: input.intent,
  });

  let loreContext = '';

  if (character.lorebook?.id) {
    const entries = await searchLorebook(character.lorebook.id, userMessage);
    loreContext = formatLoreContext(entries);
  } else if (
    character.lorebook?.entries &&
    Array.isArray(character.lorebook.entries) &&
    character.lorebook.entries.length > 0
  ) {
    const enabled = character.lorebook.entries.filter((e) => e.isEnabled !== false);
    const contexts = enabled.map((e) => e.context);
    loreContext = formatLoreContext(contexts);
  }

  return { systemPrompt, loreContext };
}
