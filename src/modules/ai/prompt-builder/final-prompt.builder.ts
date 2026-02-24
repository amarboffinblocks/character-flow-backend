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

function buildUserMessageContent(
  userMessage: string,
  userAttachments?: BuildMessagesInput['userAttachments']
): ChatMessage['content'] {
  const hasAttachments = userAttachments && userAttachments.length > 0;
  const imageAttachments = hasAttachments
    ? userAttachments!.filter((a) => a.mediaType?.startsWith('image/'))
    : [];
  const nonImageAttachments = hasAttachments
    ? userAttachments!.filter((a) => !a.mediaType?.startsWith('image/'))
    : [];

  if (!hasAttachments || imageAttachments.length === 0) {
    if (nonImageAttachments.length > 0) {
      const fileLabels = nonImageAttachments.map((f) => `[File: ${f.filename || 'attachment'}]`).join(' ');
      return `${userMessage.trim() || ''} ${fileLabels}`.trim() || '[Attachments]';
    }
    return userMessage;
  }

  const textContent = userMessage.trim() || 'Describe or respond to the attached image(s).';
  const parts: Array<{ type: 'text'; text: string } | { type: 'image'; image: string; mediaType?: string }> = [
    { type: 'text', text: textContent },
  ];

  for (const img of imageAttachments) {
    parts.push({ type: 'image', image: img.url, mediaType: img.mediaType });
  }

  if (nonImageAttachments.length > 0) {
    const fileLabels = nonImageAttachments.map((f) => `[File: ${f.filename || 'attachment'}]`).join(' ');
    parts.push({ type: 'text', text: ` ${fileLabels}` });
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

  const userContent = buildUserMessageContent(input.userMessage, input.userAttachments);
  messages.push({ role: 'user', content: userContent });

  return messages;
}
