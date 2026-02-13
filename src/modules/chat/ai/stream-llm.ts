import { streamText, smoothStream, type ModelMessage } from "ai";
import { getAIProvider } from "./provider.js";
import { resolveModel, ModelProvider } from "./model-router.js";
import { logger } from "../../../lib/logger.js";

// 🔥 important — hide internal AI SDK types
export type StreamLLMResult = ReturnType<typeof streamText>;

type StreamLLMInput = {
  provider: ModelProvider;
  model?: string;
  messages: ModelMessage[];
  temperature?: number;
  onFinish?: (params: { text: string }) => void | Promise<void>;
  onError?: (params: { error: unknown }) => void;
  /** Called when stream fails midway; receives partial text for persistence */
  onPartialSave?: (params: { partialText: string }) => void | Promise<void>;
  /** Optional context for structured logging */
  logContext?: { chatId?: string; userId?: string; messageId?: string };
};

export function streamLLM({
  provider,
  model,
  messages,
  temperature = 0.7,
  onFinish,
  onError,
  onPartialSave,
  logContext = {},
}: StreamLLMInput): StreamLLMResult {
  const aiProvider = getAIProvider(provider);
  const modelName = resolveModel(provider, model);

  // Accumulate partial text for saving on error (stream interrupted midway)
  const partialText = { current: "" };

  const result = streamText({
    model: aiProvider(modelName),
    messages,
    temperature,
    // Split large provider chunks (e.g. Gemini) into word-by-word streaming
    experimental_transform: smoothStream({
      chunking: "word",
      delayInMs: 5,
    }),
    onChunk: ({ chunk }) => {
      if (chunk.type === "text-delta" && typeof chunk.text === "string") {
        partialText.current += chunk.text;
      }
    },
    onFinish: async (params) => {
      logger.info(
        {
          ...logContext,
          provider,
          model: modelName,
          textLength: params.text?.length ?? 0,
          finishReason: params.finishReason,
        },
        "LLM stream completed"
      );
      try {
        await onFinish?.(params);
      } catch (err) {
        logger.error(
          { ...logContext, err, phase: "onFinish" },
          "Failed to persist assistant message after stream completion"
        );
      }
    },
    onError: async ({ error }) => {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(
        {
          ...logContext,
          provider,
          model: modelName,
          errorMessage: err.message,
          errorName: err.name,
          partialLength: partialText.current.length,
        },
        "LLM stream error"
      );

      onError?.({ error });

      if (partialText.current.trim() && onPartialSave) {
        try {
          await onPartialSave({ partialText: partialText.current });
          logger.info(
            { ...logContext, partialLength: partialText.current.length },
            "Saved partial response after stream failure"
          );
        } catch (saveErr) {
          logger.error(
            { ...logContext, err: saveErr, partialLength: partialText.current.length },
            "Failed to save partial response after stream failure"
          );
        }
      }
    },
  });

  return result;
}