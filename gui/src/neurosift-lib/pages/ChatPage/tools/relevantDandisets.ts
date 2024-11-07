import {
  computeEmbeddingForAbstractText,
  findSimilarDandisetIds,
  loadEmbeddings,
} from "./SimilarDandisetsView";

export const relevantDandisetsTool = {
  tool: {
    type: "function" as any,
    function: {
      name: "relevant_dandisets",
      description:
        "Returns a list of 6-digit Dandiset IDs most relevant to a given prompts, in descending order of relevance.",
      parameters: {
        type: "object",
        properties: {
          prompt: {
            type: "string",
            description: "The prompt to use to find relevant Dandisets.",
          },
          restrict_to_dandisets: {
            type: "string",
            description:
              "An optional comma-separated list of 6-digit Dandiset IDs to restrict the search to.",
          },
        },
      },
    },
  },
  function: async (
    args: { prompt: string; restrict_to_dandisets: string | null },
    onLogMessage: (title: string, message: string) => void,
  ) => {
    const { prompt, restrict_to_dandisets } = args;
    const embeddings = await loadEmbeddings();
    if (embeddings === null || embeddings === undefined) {
      throw new Error("Problem loading embeddings");
    }
    const modelName = "text-embedding-3-large";
    onLogMessage(
      "relevant_dandisets query",
      prompt + " " + restrict_to_dandisets,
    );
    const embedding = await computeEmbeddingForAbstractText(prompt, modelName);
    let dandisetIds = findSimilarDandisetIds(embeddings, embedding, modelName);
    if (restrict_to_dandisets) {
      const restrictToDandisetsSet = new Set(
        restrict_to_dandisets.split(",").map((x) => x.trim()),
      );
      dandisetIds = dandisetIds.filter((id) => restrictToDandisetsSet.has(id));
    }
    dandisetIds = dandisetIds.slice(0, 20);
    onLogMessage("relevant_dandisets response", dandisetIds.join(", "));
    return dandisetIds.join(", ");
  },
};
