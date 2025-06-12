const doDandiSemanticSearch = async (query: string): Promise<string[]> => {
  try {
    // First get semantic search results
    const response = await fetch(
      "https://dandi-semantic-search.vercel.app/api/semanticSearch",
      {
        method: "POST",
        headers: {
          "x-secret-key": "not-really-a-secret",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }),
      },
    );

    if (!response.ok) {
      console.warn("Error in semantic search:", response.statusText);
      return [];
    }

    const data = await response.json();
    const results = data.similarDandisetIds as string[];

    return results;
  } catch (error) {
    console.error("Error performing semantic search:", error);
    return [];
  }
};

export default doDandiSemanticSearch;
