/**
 * Vector Search Utilities
 * Pure JS cosine similarity and search — zero dependencies, <1ms for 38 vectors
 */

/**
 * Compute cosine similarity between two vectors
 * Returns a value between -1 and 1 (1 = identical direction)
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;

  return dotProduct / denominator;
}

export interface EmbeddingEntry {
  id: string;
  embedding: number[];
}

/**
 * Search pre-computed embeddings by cosine similarity against a query embedding.
 * Returns top-K results sorted by descending similarity score.
 */
export function searchByCosineSimilarity(
  queryEmbedding: number[],
  entries: EmbeddingEntry[],
  topK: number = 5
): { id: string; score: number }[] {
  const scored = entries.map((entry) => ({
    id: entry.id,
    score: cosineSimilarity(queryEmbedding, entry.embedding),
  }));

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}
