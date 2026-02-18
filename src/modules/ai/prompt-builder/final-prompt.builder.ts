export function buildFinalMessages({
    systemPrompt,
    toneInstruction,
    memoryPrompt,
    loreContext,
    history,
    userMessage,
  }: any) {
    return [
      { role: 'system', content: systemPrompt },
      { role: 'system', content: toneInstruction },
      { role: 'system', content: memoryPrompt },
      { role: 'system', content: `Lore:\n${loreContext}` },
      ...history,
      { role: 'user', content: userMessage },
    ];
  }