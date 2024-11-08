import { EmbeddingClient } from "./EmbeddingClient";

let globalEmbeddings:
  | {
      [dandisetId: string]: {
        [modelName: string]: number[];
      };
    }
  | null
  | undefined = undefined;
let loadingEmbeddings = false;

export const loadEmbeddings = async () => {
  while (loadingEmbeddings) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  if (globalEmbeddings) {
    return globalEmbeddings;
  }
  if (globalEmbeddings === null) {
    return null;
  }
  loadingEmbeddings = true;
  try {
    const url =
      "https://raw.githubusercontent.com/magland/ai_generated_dandiset_summaries/refs/heads/main/embeddings.json";
    const response = await fetch(url);
    globalEmbeddings = await response.json();
  } catch (err) {
    console.error("Problem loading embeddings");
    console.error(err);
    globalEmbeddings = null;
  }
  loadingEmbeddings = false;
  return globalEmbeddings;
};

// const modelName = "text-embedding-3-large";

export const computeEmbeddingForAbstractText = async (
  abstractText: string,
  modelName: string,
): Promise<number[]> => {
  const client = new EmbeddingClient({ verbose: true });
  const embedding = await client.embedding(abstractText, modelName);
  return embedding.embedding;
};

export const findSimilarDandisetIds = (
  embeddings: { [dandisetId: string]: { [modelName: string]: number[] } },
  embedding: number[],
  modelName: string,
) => {
  const similarities: { dandisetId: string; similarity: number }[] = [];
  for (const dandisetId in embeddings) {
    const embedding2 = embeddings[dandisetId][modelName];
    if (!embedding2) continue;
    const similarity = cosineSimilarity(embedding, embedding2);
    similarities.push({ dandisetId, similarity });
  }
  similarities.sort((a, b) => b.similarity - a.similarity);
  return similarities.map((s) => s.dandisetId);
};

const cosineSimilarity = (a: number[], b: number[]) => {
  let sum = 0;
  let sum_a = 0;
  let sum_b = 0;
  for (let i = 0; i < a.length; i++) {
    sum += a[i] * b[i];
    sum_a += a[i] * a[i];
    sum_b += b[i] * b[i];
  }
  return sum / Math.sqrt(sum_a) / Math.sqrt(sum_b);
};
