export function guardrail(text: string) {
    const banned = ['as an ai', 'language model', 'openai'];
  
    for (const w of banned) {
      if (text.toLowerCase().includes(w)) {
        return text.replace(/as an ai.*?\./gi, '');
      }
    }
  
    return text;
  }