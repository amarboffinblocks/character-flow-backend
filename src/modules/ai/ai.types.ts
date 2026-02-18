export type EmotionType =
  | 'happy'
  | 'sad'
  | 'angry'
  | 'romantic'
  | 'excited'
  | 'neutral';

export type IntentType =
  | 'question'
  | 'casual_chat'
  | 'romance'
  | 'roleplay'
  | 'help'
  | 'other';

export type PreprocessResult = {
  emotion: EmotionType;
  intent: IntentType;
  isSafe: boolean;
};

export type CharacterContext = {
  systemPrompt: string;
  loreContext: string;
};

export type ResponsePlan = {
  temperature: number;
  maxTokens: number;
  toneInstruction: string;
};