const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  throw new Error("Missing OPENAI_API_KEY");
}

const embeddingsJsonUrl =
  "https://lindi.neurosift.org/tmp/ai_generated_dandiset_summaries/dandiset_embeddings.json";

// {
//   "000003": [0.1, 0.2, 0.3, ...],
//   "000004": [0.2, 0.3, 0.4, ...],
//   ...
// }

type Embeddings = { [key: string]: number[] };

const globalData: {
  loadingEmbeddings: boolean;
  embeddings: Embeddings | null;
  timestampLoaded: number;
} = {
  loadingEmbeddings: false,
  embeddings: null,
  timestampLoaded: 0,
};
const loadEmbeddings = async () => {
  const timer = Date.now();
  while (globalData.loadingEmbeddings) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    if (Date.now() - timer > 10000) {
      throw new Error("Timeout loading embeddings");
    }
  }
  if (globalData.embeddings) {
    const elapsed = Date.now() - globalData.timestampLoaded;
    if (elapsed < 1000 * 60 * 3) {
      return globalData.embeddings;
    }
  }
  globalData.loadingEmbeddings = true;
  try {
    const resp = await fetch(embeddingsJsonUrl);
    if (!resp.ok) {
      throw new Error(`Failed to fetch from ${embeddingsJsonUrl}`);
    }
    globalData.embeddings = await resp.json();
    globalData.timestampLoaded = Date.now();
  } catch (err) {
    console.error("Problem loading embeddings");
    console.error(err);
    globalData.embeddings = null;
  } finally {
    globalData.loadingEmbeddings = false;
  }
  return globalData.embeddings;
};

const doEmbedding = async (text: string, model: string) => {
  if (!["text-embedding-3-small", "text-embedding-3-large"].includes(model)) {
    throw new Error(`Invalid model: ${model}`);
  }
  const apiKey = OPENAI_API_KEY;

  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input: text,
    }),
  };

  const resp = await fetch("https://api.openai.com/v1/embeddings", options);

  const json = await resp.json();
  const embedding = json.data[0].embedding;

  return { embedding };
};

const findSimilarDandisetIds = (
  embeddings: { [dandisetId: string]: number[] },
  embedding: number[]
) => {
  const similarities: { dandisetId: string; similarity: number }[] = [];
  for (const dandisetId in embeddings) {
    const embedding2 = embeddings[dandisetId];
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

interface DandiSearchResult {
  id: string;
  version: string;
  name: string;
  asset_count: number;
  size: number;
}

export async function dandiSemanticSearch(
  query: string,
  limit: number = 10
): Promise<DandiSearchResult[]> {
  const embeddings = await loadEmbeddings();
  if (!embeddings) {
    throw new Error("Failed to load embeddings");
  }

  const queryEmbedding = await doEmbedding(query, "text-embedding-3-large");
  if (!queryEmbedding.embedding) {
    throw new Error("Failed to get embedding for query");
  }
  let similarDandisetIds = findSimilarDandisetIds(
    embeddings,
    queryEmbedding.embedding
  );
  similarDandisetIds = similarDandisetIds.slice(0, limit);

  // Get full details for each dataset using DANDI API
  const ret: DandiSearchResult[] = [];
  for (const dandisetId of similarDandisetIds) {
    const url = `https://api.dandiarchive.org/api/dandisets/${dandisetId}/`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`DANDI API error: ${response.statusText}`);
    }
    const item = await response.json();
    let version;
    // if (item.most_recent_published_version) {
    //   version = item.most_recent_published_version;
    // } else {
    //   version = item.draft_version;
    // }
    // for now, let's always use draft versions
    version = item.draft_version;

    if (!version) {
      throw new Error("Failed to get version for dandiset");
    }
    ret.push({
      id: item.identifier,
      name: version.name,
      version: version.version,
      asset_count: version.asset_count,
      size: version.size,
    });
  }
  return ret;
}
