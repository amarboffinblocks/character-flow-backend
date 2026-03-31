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
  const cleaned = cleanupText(text);
  const maxLength = options.maxLength ?? DEFAULT_MAX_LENGTH;

  if (cleaned.length <= maxLength) {
    return cleaned;
  }

  const truncated = cleaned.slice(0, maxLength);
  const lastSentence = truncated.lastIndexOf('.');
  const lastNewline = truncated.lastIndexOf('\n');

  const cutPoint = Math.max(lastSentence, lastNewline, maxLength - 100);
  return truncated.slice(0, cutPoint + 1);
}

function cleanupText(text: string): string {
  const noCarriageReturn = text.replace(/\r/g, '');
  const collapsedNewlines = noCarriageReturn.replace(/\n{3,}/g, '\n\n').trim();

  const lines = collapsedNewlines
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const dedupedLines: string[] = [];
  const seen = new Set<string>();
  for (const line of lines) {
    const normalized = normalizeForDedup(line);
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    dedupedLines.push(line);
  }

  return dedupedLines.join('\n');
}

function normalizeForDedup(line: string): string {
  return line
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}
