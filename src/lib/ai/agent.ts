import { getClient, ModelProvider } from "./model-router.js";
import type OpenAI from "openai";

export interface AgentOptions {
    provider: ModelProvider;
    modelName?: string;
    instructions?: string;
    temperature?: number;
    maxTokens?: number;
}

export interface ChatMessage {
    role: "user" | "assistant" | "system";
    content: string;
}

export interface ChatCompletionResult {
    content: string;
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
}

/**
 * Create a chat completion using the appropriate client based on provider
 */
export async function createChatCompletion(
    options: AgentOptions,
    messages: ChatMessage[]
): Promise<ChatCompletionResult> {
    const client = getClient(options.provider) as OpenAI;

    // Default model names per provider
    const defaultModels: Record<ModelProvider, string> = {
        openai: "gpt-4o-mini",
        gemini: "gemini-1.5-flash",
        aws: "gpt-4o-mini", // fallback for AWS
    };

    const model = options.modelName || defaultModels[options.provider];

    // Build messages array with system instruction if provided
    const chatMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

    if (options.instructions) {
        chatMessages.push({
            role: "system",
            content: options.instructions,
        });
    }

    // Add conversation messages
    for (const msg of messages) {
        chatMessages.push({
            role: msg.role,
            content: msg.content,
        });
    }

    try {
        const response = await client.chat.completions.create({
            model,
            messages: chatMessages,
            temperature: options.temperature ?? 0.7,
            max_tokens: options.maxTokens,
        });

        const assistantMessage = response.choices[0]?.message?.content;

        if (!assistantMessage) {
            throw new Error("No response from AI model");
        }

        return {
            content: assistantMessage,
            usage: response.usage
                ? {
                    promptTokens: response.usage.prompt_tokens,
                    completionTokens: response.usage.completion_tokens,
                    totalTokens: response.usage.total_tokens,
                }
                : undefined,
        };
    } catch (error) {
        throw new Error(
            `Failed to get response from ${options.provider}: ${error instanceof Error ? error.message : String(error)
            }`
        );
    }
}
