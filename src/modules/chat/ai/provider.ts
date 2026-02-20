import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { ModelProvider } from "./model-router.js";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value?.trim()) throw new Error(`Missing required env: ${name}`);
  return value;
}

let _openai: ReturnType<typeof createOpenAI> | null = null;
let _google: ReturnType<typeof createGoogleGenerativeAI> | null = null;
let _aws: ReturnType<typeof createOpenAICompatible> | null = null;

function getOpenAI() {
  if (!_openai) _openai = createOpenAI({ apiKey: requireEnv("OPENAI_API_KEY") });
  return _openai;
}

function getGoogle() {
  if (!_google) _google = createGoogleGenerativeAI({ apiKey: requireEnv("GEMINI_API_KEY") });
  return _google;
}

function getAws() {
  if (!_aws)
    _aws = createOpenAICompatible({
      name: "Qwen/Qwen2.5-7B-Instruct",
      apiKey: process.env.AWS_LLM_API_KEY || "dummy-key",
      baseURL: requireEnv("AWS_LLM_BASE_URL"),
    });
  return _aws;
}

export function getAIProvider(provider: ModelProvider) {
  switch (provider) {
    case "openai":
      return getOpenAI();
    case "gemini":
      return (model: string) => getGoogle()(`models/${model}`);
    case "aws":
      return getAws();
    default:
      throw new Error(`Unsupported AI provider: ${provider}`);
  }
}