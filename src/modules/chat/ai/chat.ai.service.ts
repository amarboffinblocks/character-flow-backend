import {
    createChatCompletion,
    createChatCompletionStream,
    ChatMessage,
    AgentOptions,
} from "./llm.gateway.js";


// ============================================
// STREAM TYPES (used by chat.service)
// ============================================

export type StreamChunk =
    | { type: "content"; content: string }
    | { type: "usage"; usage: any }
    | { type: "done"; messageId?: string; usage?: any };


// ============================================
// Chat AI Service (Adapter layer)
// ============================================

class ChatAIService {

    // NON-STREAM reply
    async generateReply(
        options: AgentOptions & { messages: ChatMessage[] }
    ) {
        const { messages, ...agentOptions } = options;
        return createChatCompletion(agentOptions, messages);
    }

    // STREAM reply → converts OpenAI stream → StreamChunk
    async *streamReply(
        options: AgentOptions & { messages: ChatMessage[] }
    ): AsyncGenerator<StreamChunk> {

        const { messages, ...agentOptions } = options;

        const stream = createChatCompletionStream(agentOptions, messages);

        for await (const chunk of stream) {
            // token streaming
            if (!chunk.done && chunk.content) {
                yield {
                    type: "content",
                    content: chunk.content,
                };
            }

            // finish + usage
            if (chunk.done) {
                if (chunk.usage) {
                    yield {
                        type: "usage",
                        usage: chunk.usage,
                    };
                }

                return;
            }
        }
    }
}

export const chatAIService = new ChatAIService()