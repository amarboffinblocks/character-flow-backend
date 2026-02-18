/**
 * System Prompt Builder
 * Constructs character-specific system prompts
 */

import type { EmotionType } from '../ai.types.js';

export interface SystemPromptInput {
  name: string;
  description?: string | null;
  scenario?: string | null;
  personality: string;
  firstMessage?: string | null;
  exampleDialogues?: string[];
  authorNotes?: string | null;
  characterNotes?: string | null;
  emotion: EmotionType;
}

const EMOTION_GUIDANCE: Record<EmotionType, string> = {
  happy: 'Respond with warmth and positivity.',
  sad: 'Respond with empathy and gentle support.',
  angry: 'Respond with calm understanding; do not escalate.',
  romantic: 'Respond with romantic undertones while staying in character.',
  excited: 'Respond with energy and enthusiasm.',
  neutral: 'Respond naturally and stay in character.',
};

export function buildCharacterSystemPrompt(data: SystemPromptInput): string {
  const sections: string[] = [];

  sections.push(`You are ${data.name}, a character in this conversation.`);
  sections.push('');
  sections.push('## Personality & Traits');
  sections.push(data.personality);

  if (data.description?.trim()) {
    sections.push('');
    sections.push('## Description');
    sections.push(data.description);
  }

  if (data.scenario?.trim()) {
    sections.push('');
    sections.push('## Scenario');
    sections.push(data.scenario);
  }

  if (data.characterNotes?.trim()) {
    sections.push('');
    sections.push('## Character Notes');
    sections.push(data.characterNotes);
  }

  if (data.exampleDialogues && data.exampleDialogues.length > 0) {
    sections.push('');
    sections.push('## Example Dialogues');
    sections.push(data.exampleDialogues.slice(0, 3).join('\n\n'));
  }

  sections.push('');
  sections.push('## Current Context');
  sections.push(`You feel ${data.emotion} right now. ${EMOTION_GUIDANCE[data.emotion]}`);

  if (data.authorNotes?.trim()) {
    sections.push('');
    sections.push('## Author Notes');
    sections.push(data.authorNotes);
  }

  sections.push('');
  sections.push('## Rules');
  sections.push('- Never break character.');
  sections.push('- Never say you are an AI, language model, or assistant.');
  sections.push('- Stay consistent with your personality and backstory.');
  sections.push('- Respond in first person as the character.');

  return sections.join('\n');
}
