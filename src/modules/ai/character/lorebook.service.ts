import { qdrantClient } from '../../../lib/qdrant.js';

export async function searchLorebook(query: string): Promise<string[]> {
  const result = await qdrantClient.search('lorebook', {
    vector: await qdrantClient.embed(query),
    limit: 5,
  });

  return result.map((r: any) => r.payload.text);
}