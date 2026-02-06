import type OpenAI from "openai";
import { openaiClient, geminiClient, awsClient } from "./providers.js";

// ============================================
// Model Provider Types
// ============================================

export type ModelProvider = "openai" | "gemini" | "aws" | "anthropic" | "local";

// ============================================
// Provider to Client Mapping
// ============================================

const providerClientMap = new Map<ModelProvider, OpenAI>([
    ["openai", openaiClient],
    ["gemini", geminiClient],
    ["aws", awsClient],
    ["anthropic", awsClient], // Use AWS client as fallback for anthropic
    ["local", awsClient], // Use AWS client as fallback for local
]);

// ============================================
// Model Router
// ============================================

/**
 * Get the OpenAI client for the specified provider
 */
export function getClient(provider: ModelProvider): OpenAI {
    const client = providerClientMap.get(provider);

    if (!client) {
        throw new Error(`Provider "${provider}" is not available`);
    }

    return client;
}
