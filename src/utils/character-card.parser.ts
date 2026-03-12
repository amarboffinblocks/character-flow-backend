/**
 * Character Card Parser
 * Supports V1, V2 formats from JSON and PNG/JPEG with embedded metadata
 * Compatible with TavernAI, SillyTavern, and Character Card spec
 * Supports tEXt and iTXt PNG chunks (keyword: chara, chara_card_v2, ccv3)
 */

import extract from 'png-chunks-extract';
import { inflateSync } from 'node:zlib';
import { createError } from './errors.js';

/** Character card tEXt/iTXt chunk keywords (case-insensitive) */
const CARD_KEYWORDS = ['chara', 'chara_card_v2', 'ccv3'] as const;

// ============================================
// Types
// ============================================

export interface NormalizedCharacterData {
  name: string;
  description?: string | null;
  scenario?: string | null;
  summary?: string | null;
  rating?: 'SFW' | 'NSFW';
  tags?: string[];
  firstMessage?: string | null;
  alternateMessages?: string[];
  exampleDialogues?: string[];
  authorNotes?: string | null;
  characterNotes?: string | null;
  avatar?: string | null;
  backgroundImg?: string | null;
  visibility?: 'public' | 'private';
  authorName?: string | null;
}

// V1 format: flat structure
interface CharCardV1 {
  name?: string;
  description?: string;
  personality?: string;
  first_mes?: string;
  first_message?: string;
  scenario?: string;
  mes_example?: string;
  example_dialogues?: string;
  alternate_greetings?: string[];
  avatar?: string;
  tags?: string[];
  creator_notes?: string;
  character_notes?: string;
  system_prompt?: string;
  post_history_instructions?: string;
  [key: string]: unknown;
}

// V2 format: spec wrapper with data
interface CharCardV2 {
  spec?: string;
  spec_version?: string;
  data?: {
    name?: string;
    description?: string;
    personality?: string;
    first_mes?: string;
    first_message?: string;
    scenario?: string;
    mes_example?: string;
    alternate_greetings?: string[];
    avatar?: string;
    tags?: string[];
    creator_notes?: string;
    character_notes?: string;
    system_prompt?: string;
    post_history_instructions?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

// ============================================
// PNG Chunk Parsing
// ============================================

/**
 * Decode tEXt chunk: keyword (null-terminated) + value
 */
function decodeTextChunk(data: Uint8Array): { keyword: string; value: string } {
  let nullIndex = -1;
  for (let i = 0; i < data.length; i++) {
    if (data[i] === 0) {
      nullIndex = i;
      break;
    }
  }
  const keyword = nullIndex >= 0
    ? new TextDecoder('latin1').decode(data.subarray(0, nullIndex))
    : '';
  const value = nullIndex >= 0 && nullIndex < data.length - 1
    ? new TextDecoder('utf-8').decode(data.subarray(nullIndex + 1))
    : '';
  return { keyword, value };
}

/**
 * Decode iTXt chunk: keyword, compression flag, method, language, translated keyword, then text (UTF-8 or zlib)
 * iTXt allows UTF-8 and is used by many character card exporters.
 */
function decodeITxtChunk(data: Uint8Array): { keyword: string; value: string } {
  let i = 0;
  while (i < data.length && data[i] !== 0) i++;
  const keyword = i > 0 ? new TextDecoder('latin1').decode(data.subarray(0, i)) : '';
  if (i >= data.length) return { keyword, value: '' };
  i++; // skip null
  const compressionFlag = data[i] ?? 0;
  i += 2; // compression method (0 = deflate)
  while (i < data.length && data[i] !== 0) i++;
  i++; // skip null (language)
  while (i < data.length && data[i] !== 0) i++;
  i++; // skip null (translated keyword)
  if (i >= data.length) return { keyword, value: '' };
  const payload = data.subarray(i);
  let value: string;
  if (compressionFlag === 1) {
    try {
      value = inflateSync(Buffer.from(payload)).toString('utf-8');
    } catch {
      value = new TextDecoder('utf-8').decode(payload);
    }
  } else {
    value = new TextDecoder('utf-8').decode(payload);
  }
  return { keyword, value };
}

function isCardKeyword(keyword: string): keyword is (typeof CARD_KEYWORDS)[number] {
  const lower = keyword.toLowerCase();
  return CARD_KEYWORDS.some((k) => k === lower);
}

function formatFromKeyword(keyword: string): 'v1' | 'v2' | 'v3' {
  const lower = keyword.toLowerCase();
  if (lower === 'ccv3') return 'v3';
  if (lower === 'chara_card_v2') return 'v2';
  return 'v1';
}

/**
 * Decode zTXt chunk: keyword (null-terminated), compression method (1 byte), then deflate-compressed value
 */
function decodeZTxtChunk(data: Uint8Array): { keyword: string; value: string } {
  let i = 0;
  while (i < data.length && data[i] !== 0) i++;
  const keyword = i > 0 ? new TextDecoder('latin1').decode(data.subarray(0, i)) : '';
  if (i >= data.length) return { keyword, value: '' };
  i++; // skip null
  const payload = data.subarray(i);
  try {
    const value = inflateSync(Buffer.from(payload)).toString('utf-8');
    return { keyword, value };
  } catch {
    return { keyword, value: '' };
  }
}

/**
 * Extract character card JSON from PNG buffer
 * Supports tEXt and iTXt chunks with keyword: chara (V1), chara_card_v2 (V2), or ccv3 (V3).
 * Keyword matching is case-insensitive.
 */
export function extractCharacterDataFromPng(buffer: Buffer): { data: unknown; format: 'v1' | 'v2' | 'v3' } {
  const chunks = extract(buffer);

  const textChunks = chunks.filter((c) => c.name === 'tEXt' || c.name === 'iTXt' || c.name === 'zTXt');
  let rawData: string | null = null;
  let format: 'v1' | 'v2' | 'v3' = 'v1';

  for (const chunk of textChunks) {
    const data = new Uint8Array(chunk.data);
    const { keyword, value } =
      chunk.name === 'iTXt' ? decodeITxtChunk(data) : chunk.name === 'zTXt' ? decodeZTxtChunk(data) : decodeTextChunk(data);
    if (isCardKeyword(keyword) && value && value.trim() !== '') {
      rawData = value;
      format = formatFromKeyword(keyword);
      break;
    }
  }

  if (!rawData || rawData.trim() === '') {
    throw createError.badRequest(
      'PNG file does not contain character card metadata. Expected tEXt, iTXt, or zTXt chunks with keyword: chara, chara_card_v2, or ccv3 (case-insensitive).'
    );
  }

  try {
    // Decode base64 if needed (some implementations use raw JSON)
    let jsonString: string;
    try {
      jsonString = Buffer.from(rawData, 'base64').toString('utf-8');
      // If base64 decode produces non-JSON, try raw
      if (!jsonString.startsWith('{') && !jsonString.startsWith('[')) {
        jsonString = rawData;
      }
    } catch {
      jsonString = rawData;
    }

    const data = JSON.parse(jsonString);
    return { data, format };
  } catch (parseError) {
    throw createError.badRequest(
      `Failed to parse character card metadata from PNG: ${parseError instanceof Error ? parseError.message : 'Invalid JSON'}`
    );
  }
}

// ============================================
// Example Dialogue Parsing
// ============================================

/**
 * Parse mes_example / example_dialogues from character card format
 * Format: "user: msg\nchar: msg" or "{{user}}: msg\n{{char}}: msg" or similar
 */
function parseExampleDialogues(raw: string | undefined): string[] {
  if (!raw || typeof raw !== 'string' || raw.trim() === '') {
    return [];
  }
  // Split by common dialogue separators
  const dialogues: string[] = [];
  const lines = raw.split(/\r?\n/);
  let current: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Match patterns like "user:", "char:", "{{user}}:", "{{char}}:", etc.
    const match = trimmed.match(/^(\{\{?(?:user|char|name)\}?\}:?\s*)(.*)$/i);
    if (match) {
      if (current.length > 0) {
        dialogues.push(current.join('\n'));
      }
      current = [trimmed];
    } else if (current.length > 0) {
      current.push(trimmed);
    }
  }
  if (current.length > 0) {
    dialogues.push(current.join('\n'));
  }
  return dialogues.length > 0 ? dialogues : [raw];
}

// ============================================
// Normalization
// ============================================

/**
 * Extract data object from raw JSON (handles V1 flat, V2 nested, V3)
 */
function getDataObject(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>;
    // V2/V3: data wrapper
    if (obj.data && typeof obj.data === 'object' && !Array.isArray(obj.data)) {
      return obj.data as Record<string, unknown>;
    }
    // V1: flat structure
    return obj;
  }
  return {};
}

/**
 * Normalize character card data from JSON (V1 or V2 format) to our schema
 */
export function normalizeCharacterData(raw: unknown): NormalizedCharacterData {
  const data = getDataObject(raw);

  const name = (data.name ?? (raw as Record<string, unknown>)?.name) as string | undefined;
  if (!name || typeof name !== 'string') {
    throw createError.badRequest('Character name is required');
  }

  const firstMes = (data.first_mes ?? data.first_message ?? (raw as Record<string, unknown>)?.first_message) as string | undefined;
  const scenario = (data.scenario ?? (raw as Record<string, unknown>)?.scenario) as string | undefined;
  const description = (data.description ?? (raw as Record<string, unknown>)?.description) as string | undefined;
  const personality = (data.personality ?? (raw as Record<string, unknown>)?.personality) as string | undefined;
  const mesExample = (data.mes_example ?? data.example_dialogues ?? (raw as Record<string, unknown>)?.mes_example) as string | undefined;
  const altGreetings = (data.alternate_greetings ?? (raw as Record<string, unknown>)?.alternate_greetings) as string[] | undefined;
  const creatorNotes = (data.creator_notes ?? (raw as Record<string, unknown>)?.creator_notes) as string | undefined;
  const characterNotes = (data.character_notes ?? (raw as Record<string, unknown>)?.character_notes) as string | undefined;
  const avatar = (data.avatar ?? (raw as Record<string, unknown>)?.avatar) as string | undefined;
  const tags = (data.tags ?? (raw as Record<string, unknown>)?.tags) as string[] | string | undefined;

  return {
    name: String(name).trim(),
    description: description ? String(description).trim() : null,
    scenario: scenario ? String(scenario).trim() : null,
    summary: personality ? String(personality).trim() : null,
    rating: 'SFW',
    tags: Array.isArray(tags) ? tags.map(String) : typeof tags === 'string' ? tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
    firstMessage: firstMes ? String(firstMes).trim() : null,
    alternateMessages: Array.isArray(altGreetings) ? altGreetings.map(String) : [],
    exampleDialogues: parseExampleDialogues(mesExample),
    authorNotes: creatorNotes ? String(creatorNotes).trim() : null,
    characterNotes: characterNotes ? String(characterNotes).trim() : null,
    avatar: avatar ? String(avatar) : null,
    backgroundImg: null,
    visibility: 'private',
    authorName: null,
  };
}

/**
 * Parse character from JSON file (supports V1 and V2)
 */
export function parseCharacterFromJson(jsonString: string): NormalizedCharacterData {
  let raw: unknown;
  try {
    raw = JSON.parse(jsonString);
  } catch {
    throw createError.badRequest('Invalid JSON format');
  }
  return normalizeCharacterData(raw);
}

/**
 * Parse character from PNG buffer (extracts metadata + returns normalized data)
 */
export function parseCharacterFromPng(buffer: Buffer): NormalizedCharacterData {
  const { data } = extractCharacterDataFromPng(buffer);
  return normalizeCharacterData(data);
}