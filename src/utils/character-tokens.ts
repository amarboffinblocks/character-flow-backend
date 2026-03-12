/**
 * Character token calculation (backend).
 * Matches client logic: sum of character lengths for fields that count toward context.
 * Same fields as client schema (tokens: true): description, scenario, summary,
 * firstMessage, alternateMessages, exampleDialogues.
 */

function textLength(value: string | null | undefined): number {
  if (value == null || typeof value !== 'string') return 0;
  return value.length;
}

function arrayLengths(arr: unknown[]): number {
  return arr.reduce((sum: number, item) => sum + textLength(typeof item === 'string' ? item : String(item)), 0);
}

export interface CharacterTokenSource {
  description?: string | null;
  scenario?: string | null;
  summary?: string | null;
  firstMessage?: string | null;
  alternateMessages?: string[] | null;
  exampleDialogues?: string[] | null;
}

/**
 * Calculate total token count for a character (length-based, same as client).
 */
export function calculateCharacterTokens(data: CharacterTokenSource): number {
  const desc = textLength(data.description);
  const scenario = textLength(data.scenario);
  const summary = textLength(data.summary);
  const first = textLength(data.firstMessage);
  const alt = Array.isArray(data.alternateMessages) ? arrayLengths(data.alternateMessages) : 0;
  const examples = Array.isArray(data.exampleDialogues) ? arrayLengths(data.exampleDialogues) : 0;
  return desc + scenario + summary + first + alt + examples;
}
