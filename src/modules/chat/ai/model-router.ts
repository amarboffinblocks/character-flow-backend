export type ModelProvider = "openai" | "gemini" | "aws";

export const DEFAULT_MODELS: Record<ModelProvider, string> = {
  openai: "gpt-4o-mini",
  gemini: "gemini-2.5-flash",
  aws: "gpt-4o-mini",
};

export function resolveModel(provider: ModelProvider, model?: string | null) {
  return model || DEFAULT_MODELS[provider];
}

/** Map DB model provider to AI SDK ModelProvider. Throws for unsupported providers. */
export function mapProviderToModelProvider(
  provider: string
): ModelProvider {
  const supported: ModelProvider[] = ["openai", "gemini", "aws"];
  if (supported.includes(provider as ModelProvider)) {
    return provider as ModelProvider;
  }
  throw new Error(
    `Unsupported model provider: ${provider}. Supported: openai, gemini, aws.`
  );
}