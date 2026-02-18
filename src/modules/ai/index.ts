/**
 * AI Module
 * Character AI pipeline: preprocess → context → plan → build → postprocess
 */

export { runAIOrchestrator } from './orchestrator/ai-orchestrator.service.js';
export { preprocessMessage } from './preprocessor/preprocessor.service.js';
export { postprocessResponse } from './postprocessor/postprocessor.service.js';
export { buildCharacterContext } from './character/character-context.service.js';
export { planResponse } from './prompt-planner/prompt-planner.service.js';
export { buildFinalMessages } from './prompt-builder/final-prompt.builder.js';

export type {
  PreprocessResult,
  CharacterContext,
  ResponsePlan,
  ChatMessage,
  AIOrchestratorInput,
  AIOrchestratorResult,
  EmotionType,
  IntentType,
} from './ai.types.js';
