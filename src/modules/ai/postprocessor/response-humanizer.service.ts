export function humanize(text: string) {
    if (text.length > 400) return text.slice(0, 400) + '...';
    return text;
  }