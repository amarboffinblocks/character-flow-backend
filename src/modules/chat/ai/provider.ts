import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { ModelProvider } from "./model-router.js";

// Create provider instances once (singleton)
const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

const aws = createOpenAICompatible({
  name: "aws-llm",
  apiKey: process.env.AWS_LLM_API_KEY || "dummy-key",
  baseURL: process.env.AWS_LLM_BASE_URL!,
});

// return correct provider
export function getAIProvider(provider: ModelProvider) {
    switch (provider) {
      case "openai":
        return openai;
  
      case "gemini":
        // 🔥 Gemini needs model prefix
        return (model: string) => google(`models/${model}`);
  
      case "aws":
        return aws;
    }
  }