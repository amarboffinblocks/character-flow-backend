import type { ModelMessage } from "ai";

export function toModelMessages(
    msgs: { role: "user" | "assistant" | "system"; content: string }[]
): ModelMessage[] {
    return msgs.map((m): ModelMessage => {
        switch (m.role) {
            case "system":
                return { role: "system", content: m.content };
            case "user":
                return { role: "user", content: m.content };
            case "assistant":
                return { role: "assistant", content: m.content };
        }
    });
}