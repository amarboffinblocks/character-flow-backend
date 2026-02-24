import type { ModelMessage } from "ai";
import type { ChatMessage } from "../../ai/ai.types.js";

export function toModelMessages(msgs: ChatMessage[]): ModelMessage[] {
  return msgs.map((m) => ({ role: m.role, content: m.content } as ModelMessage));
}