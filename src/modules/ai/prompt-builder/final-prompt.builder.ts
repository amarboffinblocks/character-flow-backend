/**
 * Final Prompt Builder
 * Assembles system + memory + lore + history into model messages
 */

import type { ChatMessage, BuildMessagesInput } from '../ai.types.js';

function buildSystemParts(input: BuildMessagesInput): string[] {
  const parts: string[] = [input.systemPrompt];

  if (input.toneInstruction?.trim()) {
    parts.push(input.toneInstruction);
  }

  if (input.memoryPrompt?.trim()) {
    parts.push('## Relevant Past Context');
    parts.push(input.memoryPrompt);
  }

  if (input.loreContext?.trim()) {
    parts.push('## Lore & World Knowledge');
    parts.push(input.loreContext);
  }

  return parts;
}

export function buildFinalMessages(input: BuildMessagesInput): ChatMessage[] {
  const systemParts = buildSystemParts(input);
  const systemContent = systemParts.join('\n\n');

  const messages: ChatMessage[] = [{ role: 'system', content: systemContent }];

  for (const msg of input.history) {
    if (msg.role === 'user' || msg.role === 'assistant') {
      messages.push(msg);
    }
  }

  messages.push({ role: 'user', content: input.userMessage });

  return messages;
}
