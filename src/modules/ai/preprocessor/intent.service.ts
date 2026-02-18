import { generateText } from 'ai';

export async function detectIntent(message: string): Promise<any> {
  const { text } = await generateText({
    model: 'google/gemini-2.5-flash',
    prompt: `
Classify user intent in ONE word:
question, casual_chat, romance, roleplay, help, other

Message: ${message}
Intent:
`,
    temperature: 0,
    maxTokens: 5,
  });

  return text.trim().toLowerCase();
}