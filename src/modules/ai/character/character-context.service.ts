import { searchLorebook } from './lorebook.service.js';
import { buildCharacterSystemPrompt } from './system-prompt.builder.js';

export async function buildCharacterContext({
  character,
  message,
  emotion,
}: any) {
  const loreEntries = await searchLorebook(message);

  const loreContext = loreEntries.join('\n');

  const systemPrompt = buildCharacterSystemPrompt({
    name: character.name,
    persona: character.persona,
    traits: character.traits,
    emotion,
  });

  return { systemPrompt, loreContext };
}