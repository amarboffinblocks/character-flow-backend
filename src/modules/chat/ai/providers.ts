import OpenAI from "openai";
import { logger } from "../../../lib/logger.js";

export type AIProvider = "openai" | "gemini" | "aws";

let openaiClient: OpenAI | null = null;
let geminiClient: OpenAI | null = null;
let awsClient: OpenAI | null = null;

// ---------------- OPENAI ----------------
function createOpenAIClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY missing");
  }

  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

// ---------------- GEMINI ----------------
// Gemini provides OpenAI compatible endpoint
function createGeminiClient(): OpenAI {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY missing");
  }

  return new OpenAI({
    apiKey: process.env.GEMINI_API_KEY,
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
  });
}

// ---------------- AWS / SELF HOSTED ----------------
function createAWSClient(): OpenAI {
  if (!process.env.AWS_LLM_BASE_URL) {
    throw new Error("AWS_LLM_BASE_URL missing");
  }

  return new OpenAI({
    apiKey: process.env.AWS_LLM_API_KEY || "dummy-key",
    baseURL: process.env.AWS_LLM_BASE_URL,
  });
}

// ---------------- PUBLIC GETTER ----------------
export function getClient(provider: AIProvider): OpenAI {
  switch (provider) {
    case "openai":
      if (!openaiClient) {
        openaiClient = createOpenAIClient();
        logger.info("OpenAI client initialized");
      }
      return openaiClient;

    case "gemini":
      if (!geminiClient) {
        geminiClient = createGeminiClient();
        logger.info("Gemini client initialized");
      }
      return geminiClient;

    case "aws":
      if (!awsClient) {
        awsClient = createAWSClient();
        logger.info("AWS client initialized");
      }
      return awsClient;
  }
}