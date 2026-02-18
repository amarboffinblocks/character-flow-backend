/**
 * Response Humanizer Service
 * Applies light post-processing for natural output (truncation, etc.)
 */

const DEFAULT_MAX_LENGTH = 8000;

export interface HumanizeOptions {
  maxLength?: number;
}

export function humanize(
  text: string,
  options: HumanizeOptions = {}
): string {
  const maxLength = options.maxLength ?? DEFAULT_MAX_LENGTH;

  if (text.length <= maxLength) {
    return text;
  }

  const truncated = text.slice(0, maxLength);
  const lastSentence = truncated.lastIndexOf('.');
  const lastNewline = truncated.lastIndexOf('\n');

  const cutPoint = Math.max(lastSentence, lastNewline, maxLength - 100);
  return truncated.slice(0, cutPoint + 1);
}
