import OpenAI from "openai";
import { logger } from "../../../lib/logger.js";
import { getClient } from "./providers.js";
import { resolveModel, ModelProvider } from "./model-router.js";

// =====================================================
// SHARED TYPES (provider agnostic)
// =====================================================

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface AgentOptions {
  provider: ModelProvider;
  modelName?: string;
  instructions?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ChatCompletionResult {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// =====================================================
// INTERNAL: Convert messages → OpenAI format
// (kept isolated so we can swap providers later)
// =====================================================

function buildMessages(messages: ChatMessage[], instructions?: string) {
  const result: any[] = [];

  if (instructions) {
    result.push({ role: "system", content: instructions });
  }

  for (const m of messages) {
    result.push({ role: m.role, content: m.content });
  }

  return result;
}

////////////////////////////////////////////////////////
// NORMAL COMPLETION
////////////////////////////////////////////////////////

export async function createChatCompletion(
  options: AgentOptions,
  messages: ChatMessage[]
): Promise<ChatCompletionResult> {

  const client = getClient(options.provider);
  const model = resolveModel(options.provider, options.modelName);

  try {
    const res = await client.chat.completions.create({
      model,
      messages: buildMessages(messages, options.instructions),
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens,
    });

    const text = res.choices?.[0]?.message?.content;
    if (!text) throw new Error("Empty model response");

    return {
      content: text,
      usage: res.usage
        ? {
            promptTokens: res.usage.prompt_tokens,
            completionTokens: res.usage.completion_tokens,
            totalTokens: res.usage.total_tokens,
          }
        : undefined,
    };

  } catch (err: any) {
    logger.error(err, "Chat completion failed");
    throw err;
  }
}

////////////////////////////////////////////////////////
// STREAMING COMPLETION (SSE CORE)
////////////////////////////////////////////////////////

export async function* createChatCompletionStream(
  options: AgentOptions,
  messages: ChatMessage[]
): AsyncGenerator<{ content: string; done: boolean; usage?: any }> {

  const client = getClient(options.provider);
  const model = resolveModel(options.provider, options.modelName);

  const stream = await client.chat.completions.create({
    model,
    messages: buildMessages(messages, options.instructions),
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens,
    stream: true,
    stream_options: { include_usage: true },
  });

  let usage: any = null;

  try {
    for await (const chunk of stream) {

      // 🔹 usage chunk arrives separately at end
      if (chunk.usage) {
        usage = {
          promptTokens: chunk.usage.prompt_tokens,
          completionTokens: chunk.usage.completion_tokens,
          totalTokens: chunk.usage.total_tokens,
        };
      }

      const delta = chunk.choices?.[0]?.delta?.content;

      if (delta) {
        yield { content: delta, done: false };
      }
    }

    // 🔹 Stream finished safely
    yield { content: "", done: true, usage };

  } catch (err) {
    logger.error(err, "Streaming completion failed");
    throw err;
  }
}