import { streamText, type ModelMessage } from "ai";
import { getAIProvider } from "./provider.js";
import { resolveModel, ModelProvider } from "./model-router.js";

// 🔥 important — hide internal AI SDK types
export type StreamLLMResult = ReturnType<typeof streamText>;

type StreamLLMInput = {
  provider: ModelProvider;
  model?: string;
  messages: ModelMessage[];
  temperature?: number;
  onFinish?: (params: { text: string }) => void | Promise<void>;
  onError?: (params: { error: unknown }) => void;
};

export function streamLLM({
  provider,
  model,
  messages,
  temperature = 0.7,
  onFinish,
  onError,
}: StreamLLMInput): StreamLLMResult {
  const aiProvider = getAIProvider(provider);
  const modelName = resolveModel(provider, model);

  return streamText({
    model: aiProvider(modelName),
    messages,
    temperature,
    onFinish,
    onError,
  });
}