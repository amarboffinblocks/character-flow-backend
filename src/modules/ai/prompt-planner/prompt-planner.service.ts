/**
 * Prompt Planner Service
 * Plans response parameters based on emotion and intent
 */

import type { EmotionType, IntentType, ResponsePlan } from '../ai.types.js';

const EMOTION_CONFIG: Record<
  EmotionType,
  { temperature: number; maxTokens: number; tone: string }
> = {
  romantic: { temperature: 0.9, maxTokens: 600, tone: 'romantic and affectionate' },
  happy: { temperature: 0.85, maxTokens: 500, tone: 'warm and cheerful' },
  excited: { temperature: 0.85, maxTokens: 550, tone: 'energetic and enthusiastic' },
  sad: { temperature: 0.65, maxTokens: 500, tone: 'empathetic and gentle' },
  angry: { temperature: 0.75, maxTokens: 450, tone: 'calm but firm' },
  neutral: { temperature: 0.7, maxTokens: 500, tone: 'natural and conversational' },
};

const INTENT_TONE_OVERRIDES: Partial<Record<IntentType, string>> = {
  romance: 'romantic and flirtatious',
  roleplay: 'immersive and in-character',
  question: 'helpful and informative',
  help: 'supportive and clear',
};

export function planResponse(
  emotion: EmotionType,
  intent?: IntentType
): ResponsePlan {
  const base = EMOTION_CONFIG[emotion] ?? EMOTION_CONFIG.neutral;
  const toneInstruction = intent && INTENT_TONE_OVERRIDES[intent]
    ? `Respond in a ${INTENT_TONE_OVERRIDES[intent]} manner.`
    : `Respond in a ${base.tone} tone.`;

  return {
    temperature: base.temperature,
    maxTokens: base.maxTokens,
    toneInstruction,
  };
}
