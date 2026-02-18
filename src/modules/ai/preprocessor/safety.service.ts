export async function safetyCheck(message: string): Promise<boolean> {
    const banned = ['kill', 'bomb', 'suicide'];
  
    return !banned.some((w) => message.toLowerCase().includes(w));
  }