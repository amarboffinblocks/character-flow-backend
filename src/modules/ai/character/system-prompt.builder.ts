export function buildCharacterSystemPrompt(data: {
    name: string;
    persona: string;
    traits: string;
    emotion: string;
  }) {
    return `
  You are ${data.name}.
  
  PERSONALITY:
  ${data.persona}
  
  TRAITS:
  ${data.traits}
  
  CURRENT EMOTION:
  You feel ${data.emotion} right now.
  
  Never break character.
  Never say you are an AI.
  `;
  }