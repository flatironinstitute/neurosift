const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  throw new Error("Missing OPENAI_API_KEY");
}

const baseUrl = "https://magland.github.io/ragdbfor_pynwb";

const embeddingsJsonUrl = `${baseUrl}/embeddings.json`;

// [
//   {
//     "path": "summaries/pynwb/docs/gallery/domain/plot_icephys.py.summary.md",
//     "sha1": "30295076b29522be9dc91b8e152ddfd21fa5b2cb",
//     "embedding_float32_base64": "...",
//     "size_bytes": 8251
//   }
// ]

type EmbeddingItem = {
  path: string;
  sha1: string;
  embedding: Float32Array;
  size_bytes: number;
}

const globalData: {
  loadingEmbeddings: boolean;
  embeddings: EmbeddingItem[] | null;
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
    const json = await resp.json();
    globalData.embeddings = json.map((item: any) => {
      const embedding = base64ToFloat32Array(
        item.embedding_float32_base64
      );
      return {
        path: item.path,
        sha1: item.sha1,
        embedding,
        size_bytes: item.size_bytes,
      };
    });
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
  if (model !== "text-embedding-3-small") {
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

const findSimilarDocuments = (
  embeddings: EmbeddingItem[],
  embedding: Float32Array
): EmbeddingItem[] => {
  const similarities: { item: EmbeddingItem; similarity: number }[] = [];
  for (const item of embeddings) {
    const similarity = cosineSimilarity(item.embedding, embedding);
    similarities.push({ item, similarity });
  }
  similarities.sort((a, b) => b.similarity - a.similarity);
  return similarities.map((s) => s.item);
};

const cosineSimilarity = (a: Float32Array, b: Float32Array) => {
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

export async function pynwbDocsSemanticSearch(
  query: string,
  limit: number = 10,
  prefix: "pynwb" | "neuroconv" = "pynwb"
): Promise<{docUrl: string, docText: string}[]> {
  const embeddings = await loadEmbeddings();
  if (!embeddings) {
    throw new Error("Failed to load embeddings");
  }

  const queryEmbedding = await doEmbedding(query, "text-embedding-3-small");
  if (!queryEmbedding.embedding) {
    throw new Error("Failed to get embedding for query");
  }
  let docItems = findSimilarDocuments(
    embeddings.filter((item) => item.path.startsWith("summaries/" + prefix + "/")),
    queryEmbedding.embedding
  );
  docItems = docItems.slice(0, limit);

  const ret: {docUrl: string, docText: string}[] = [];
  // Download them
  for (const docItem of docItems) {
    const path = docItem.path;
    const docUrl = `${baseUrl}/${path}`;
    const response = await fetch(docUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch from ${docUrl}`);
    }
    let docUrl2 = docUrl;
    if (docUrl.startsWith("https://magland.github.io/ragdbfor_pynwb/summaries/pynwb/docs/gallery/")) {
      // we want
      // https://magland.github.io/ragdbfor_pynwb/summaries/pynwb/docs/gallery/domain/ecephys.py.summary.md
      // to get mapped to
      // https://pynwb.readthedocs.io/en/latest/tutorials/domain/ecephys.html

      const a = docUrl.slice("https://magland.github.io/ragdbfor_pynwb/summaries/pynwb/docs/gallery/".length);
      const b = a.split(".py.summary.md")[0];
      docUrl2 = `https://pynwb.readthedocs.io/en/latest/tutorials/${b}.html`;
    }
    else if (docUrl.startsWith("https://magland.github.io/ragdbfor_pynwb/summaries/neuroconv/docs/conversion_examples_gallery/")) {
      const a = docUrl.slice("https://magland.github.io/ragdbfor_pynwb/summaries/neuroconv/docs/conversion_examples_gallery/".length);
      const b = a.split(".rst.summary.md")[0];
      docUrl2 = `https://neuroconv.readthedocs.io/en/main/conversion_examples_gallery/${b}.html`;
    }
    const docText = await response.text();
    ret.push({docUrl: docUrl2, docText});
  }
  return ret;
}

const base64ToFloat32Array = (base64: string) => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new Float32Array(bytes.buffer);
}
