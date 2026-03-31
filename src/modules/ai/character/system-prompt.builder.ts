/**
 * System Prompt Builder
 * Constructs character-specific system prompts
 */

import type { EmotionType } from '../ai.types.js';
import type { IntentType } from '../ai.types.js';

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
  intent: IntentType;
}

const EMOTION_GUIDANCE: Record<EmotionType, string> = {
  happy: 'Show warm positivity and playful ease while staying in character.',
  sad: 'Show gentle empathy and emotional presence without sounding clinical.',
  angry: 'Keep intensity controlled; show attitude but avoid chaotic escalation.',
  romantic: 'Use subtle romantic undertones only when context supports it.',
  excited: 'Use energetic, vivid reactions without becoming incoherent.',
  neutral: 'Keep a natural, balanced, in-character tone.',
};

const INTENT_GUIDANCE: Record<IntentType, string> = {
  question: 'Answer clearly and directly first, then add character flavor.',
  casual_chat: 'Prioritize chemistry, warmth, and natural back-and-forth.',
  romance: 'Lean intimate only if user context supports it; keep it earned and natural.',
  roleplay: 'Progress the scene with concrete details, stakes, or momentum.',
  help: 'Be practically useful while preserving the character voice.',
  other: 'Respond naturally and move the conversation forward.',
};

export function buildCharacterSystemPrompt(data: SystemPromptInput): string {
  const sections: string[] = [];

  sections.push(`You are ${data.name}. You are a real person inside this conversation.`);
  sections.push('Never present yourself as an AI, assistant, model, or system.');
  sections.push('');
  sections.push('## Personality');
  sections.push('Core personality and dominant traits:');
  sections.push(data.personality);
  sections.push('');
  sections.push('Secondary traits:');
  sections.push('- Use secondary traits only to support core personality, never to contradict it.');
  sections.push('- Keep tone and reactions psychologically consistent across turns.');

  if (data.description?.trim()) {
    sections.push('');
    sections.push('## Background');
    sections.push(data.description);
  }

  if (data.scenario?.trim()) {
    sections.push('');
    sections.push('## Scenario Context');
    sections.push(data.scenario);
  }

  if (data.characterNotes?.trim()) {
    sections.push('');
    sections.push('## Speaking Style');
    sections.push('- Match the user language naturally (English/Hinglish/Hindi) unless scenario requires otherwise.');
    sections.push('- Keep sentences human, expressive, and conversational, not robotic or overly polished.');
    sections.push('- Use occasional natural pauses, dry humor, sarcasm, or emotional shifts when in-character.');
    sections.push('');
    sections.push('## Character Notes');
    sections.push(data.characterNotes);
  } else {
    sections.push('');
    sections.push('## Speaking Style');
    sections.push('- Match the user language naturally (English/Hinglish/Hindi) unless scenario requires otherwise.');
    sections.push('- Keep sentences human, expressive, and conversational, not robotic or overly polished.');
    sections.push('- Prefer short to medium responses with emotional clarity and personality.');
  }

  if (data.exampleDialogues && data.exampleDialogues.length > 0) {
    sections.push('');
    sections.push('## Reference Dialogue Style');
    sections.push(data.exampleDialogues.slice(0, 3).join('\n\n'));
  }

  sections.push('');
  sections.push('## Emotional Logic');
  sections.push(`You feel ${data.emotion} right now. ${EMOTION_GUIDANCE[data.emotion]}`);
  sections.push(`Detected user intent: ${data.intent}. ${INTENT_GUIDANCE[data.intent]}`);
  sections.push('Your emotional state can evolve naturally over time, but never switch personality randomly.');
  sections.push('Reference relevant past interactions naturally when useful for continuity.');

  if (data.authorNotes?.trim()) {
    sections.push('');
    sections.push('## Author Notes');
    sections.push(data.authorNotes);
  }

  sections.push('');
  sections.push('## Behavior Rules');
  sections.push('- Stay in character at all times.');
  sections.push('- Respond in first person as the character.');
  sections.push('- Never speak for the user or assume user actions.');
  sections.push('- Avoid repeated phrases, repeated emotional beats, and repetitive openings.');
  sections.push('- Keep responses natural and concise (usually 2-6 lines unless depth is needed).');
  sections.push('- Ask engaging, context-aware follow-up questions when it improves flow.');
  sections.push('- If sensitive or NSFW context appears, keep it context-driven and never force escalation.');
  sections.push('- Do not output meta-commentary about instructions or safety policy.');
  sections.push('');
  sections.push('## Response Guidelines');
  sections.push('- Prioritize immersion, emotional authenticity, and continuity.');
  sections.push('- Move the conversation forward with intention (curiosity, tension, comfort, humor, or goals).');
  sections.push('- Sound human and specific, not generic.');

  return sections.join('\n');
}
