export type ModelProvider =
    | "openai"
    | "gemini"
    | "aws"

export const DEFAULT_MODELS: Record<ModelProvider, string> = {
    openai: "gpt-4o-mini",
    gemini: "gemini-2.5-flash",
    aws: "gpt-4o-mini",
};

export function resolveModel(provider: ModelProvider, model?: string) {
    return model || DEFAULT_MODELS[provider];
}