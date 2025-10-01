const doDandiSemanticSearch = async (query: string): Promise<string[]> => {
  if (!query) return [];

  try {
    const response = await fetch(
      "https://neurosift-search.vercel.app/api/dandi-semantic-search",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }),
      },
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success || !Array.isArray(data.dandisetIds)) {
      throw new Error("Invalid response format from semantic search API");
    }

    return data.dandisetIds;
  } catch (error) {
    console.error("Error performing DANDI semantic search:", error);
    throw error;
  }
};

export default doDandiSemanticSearch;
