import type { ModelMessage } from "ai";

export function toModelMessages(
  msgs: { role: "user" | "assistant" | "system"; content: string }[]
): ModelMessage[] {
  return msgs.map((m): ModelMessage => ({ role: m.role, content: m.content }));
}