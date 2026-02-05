import OpenAI from "openai";
import { logger } from "../logger.js";

// ============================================
// AI Provider Clients (Singleton Pattern)
// ============================================

let _openaiClient: OpenAI | null = null;
let _geminiClient: OpenAI | null = null;
let _awsClient: OpenAI | null = null;

/**
 * Get or create OpenAI client (singleton pattern)
 */
function getOpenAIClient(): OpenAI {
    if (!_openaiClient) {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            throw new Error("OPENAI_API_KEY is not configured");
        }
        _openaiClient = new OpenAI({
            apiKey,
        });
        logger.info("OpenAI client initialized");
    }
    return _openaiClient;
}

/**
 * Get or create Gemini client (singleton pattern)
 */
function getGeminiClient(): OpenAI {
    if (!_geminiClient) {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error("GEMINI_API_KEY is not configured");
        }
        _geminiClient = new OpenAI({
            apiKey,
            baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",

        });
        logger.info("Gemini client initialized");
    }
    return _geminiClient;
}

/**
 * Get or create AWS client (singleton pattern)
 */
function getAWSClient(): OpenAI {
    if (!_awsClient) {
        const baseURL = process.env.AWS_LLM_BASE_URL;
        if (!baseURL) {
            throw new Error("AWS_LLM_BASE_URL is not configured");
        }
        _awsClient = new OpenAI({
            apiKey: "dummy-key", // Most self-hosted servers ignore this
            baseURL,
        });
        logger.info("AWS LLM client initialized");
    }
    return _awsClient;
}

// Export getter functions for lazy initialization
// This prevents initialization errors if env vars aren't set until the provider is actually used
export function getOpenAIClientInstance(): OpenAI {
    return getOpenAIClient();
}

export function getGeminiClientInstance(): OpenAI {
    return getGeminiClient();
}

export function getAWSClientInstance(): OpenAI {
    return getAWSClient();
}

// Legacy exports for backward compatibility (will throw if env vars not set)
// These are used by model-router.ts
export const openaiClient = getOpenAIClient();
export const geminiClient = getGeminiClient();
export const awsClient = getAWSClient();
