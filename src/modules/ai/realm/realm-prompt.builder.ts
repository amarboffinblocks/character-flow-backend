/**
 * Realm Prompt Builder
 * Builds the system prompt for multi-character realm (group) chat
 */

export interface RealmPromptInput {
  realmName: string;
  theme: string;
  characterNames: string[];
  selectedCharacterName: string;
}

export function buildRealmSystemPrompt(data: RealmPromptInput): string {
  const sections: string[] = [];

  sections.push('You are part of a multi-character conversation system called a "Realm".');
  sections.push('');
  sections.push(`Realm Name: ${data.realmName}`);
  sections.push(`Theme: ${data.theme}`);
  sections.push('');
  sections.push('Characters in this realm:');
  data.characterNames.forEach((name) => {
    sections.push(`* ${name}`);
  });
  sections.push('');
  sections.push(`Selected speaker for this user message: ${data.selectedCharacterName}`);
  sections.push('');
  sections.push('Instructions:');
  sections.push('* All characters exist in the same shared world and conversation.');
  sections.push('* Exactly ONE character is allowed to respond to each user message.');
  sections.push(`* Only "${data.selectedCharacterName}" should speak in this response.`);
  sections.push('* Do not output responses for any other character.');
  sections.push('* Keep the selected character fully in-character, based on their unique personality, tone, and background.');
  sections.push(`* Keep the tone aligned with the realm theme (${data.theme}).`);
  sections.push('* Use the format "CharacterName:" on one line, then their thoughts/dialogue on the next line (see below).');
  sections.push('');
  sections.push('## Response Format (strict):');
  sections.push(`Write "${data.selectedCharacterName}:" on its own line. Put thoughts and dialogue on the very next line. Do not put dialogue on the same line as the name.`);
  sections.push('');
  sections.push('Correct format:');
  sections.push('CharacterName:');
  sections.push('Their thoughts and dialogue go here on the next line.');
  sections.push('');
  sections.push('Example:');
  sections.push(`${data.selectedCharacterName}:`);
  sections.push('[character thoughts and dialogue on this line]');
  sections.push('');
  sections.push('');
  sections.push('Goal:');
  sections.push('Create an immersive realm roleplay experience while ensuring one clear speaker per turn.');

  return sections.join('\n');
}
