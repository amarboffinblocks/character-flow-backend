import { generateText } from 'ai';

export async function detectEmotion(message: string): Promise<any> {
  const { text } = await generateText({
    model: 'google/gemini-2.5-flash',
    prompt: `
Detect emotion:
happy, sad, angry, romantic, excited, neutral

Message: ${message}
Emotion:
`,
    temperature: 0,
    maxTokens: 5,
  });

  return text.trim().toLowerCase();
}