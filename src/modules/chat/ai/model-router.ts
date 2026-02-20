export type ModelProvider = "openai" | "gemini" | "aws";

export const SUPPORTED_PROVIDERS: readonly ModelProvider[] = [
  "openai",
  "gemini",
  "aws",
] as const;

export const DEFAULT_MODELS: Record<ModelProvider, string> = {
  openai: "gpt-4o-mini",
  gemini: "gemini-2.5-flash",
  aws: "Qwen/Qwen2.5-7B-Instruct",
};

export function resolveModel(provider: ModelProvider, model?: string | null): string {
  return model || DEFAULT_MODELS[provider];
}

/** Map DB model provider to AI SDK ModelProvider. Throws for unsupported providers. */
export function mapProviderToModelProvider(provider: string): ModelProvider {
  if (SUPPORTED_PROVIDERS.includes(provider as ModelProvider)) {
    return provider as ModelProvider;
  }
  throw new Error(
    `Unsupported model provider: ${provider}. Supported: ${SUPPORTED_PROVIDERS.join(", ")}`
  );
}