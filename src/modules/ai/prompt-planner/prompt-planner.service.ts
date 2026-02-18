import { ResponsePlan } from '../ai.types.js';

export function planResponse(emotion: string): ResponsePlan {
  const map: any = {
    romantic: { temperature: 0.9 },
    happy: { temperature: 0.8 },
    excited: { temperature: 0.85 },
    sad: { temperature: 0.6 },
    angry: { temperature: 0.7 },
    neutral: { temperature: 0.5 },
  };

  const cfg = map[emotion] ?? map.neutral;

  return {
    temperature: cfg.temperature,
    maxTokens: 500,
    toneInstruction: `Respond in a ${emotion} tone.`,
  };
}