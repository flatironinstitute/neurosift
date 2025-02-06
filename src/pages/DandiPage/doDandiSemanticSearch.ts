import { DandisetSearchResultItem } from "./dandi-types";
import getAuthorizationHeaderForUrl from "../util/getAuthorizationHeaderForUrl";

const doDandiSemanticSearch = async (
  query: string,
  limit: number = 10,
): Promise<{ results: DandisetSearchResultItem[]; total: number }> => {
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
      return { results: [], total: 0 };
    }

    const data = await response.json();
    const results = data.similarDandisetIds as string[];

    // Limit to a few results and fetch full dandiset info for each
    // Return total count along with the paginated results
    const total = results.length;

    const dandisets = await Promise.all(
      results.slice(0, limit).map(async (dandisetId) => {
        const url = `https://api.dandiarchive.org/api/dandisets/${dandisetId}`;
        const authorizationHeader = getAuthorizationHeaderForUrl(url);
        const headers = authorizationHeader
          ? { Authorization: authorizationHeader }
          : undefined;

        try {
          const response = await fetch(url, { headers });
          if (response.status === 200) {
            const json = await response.json();
            return json as DandisetSearchResultItem;
          }
        } catch (error) {
          console.error("Error fetching dandiset details:", error);
        }
        return null;
      }),
    );

    // Filter out any failed requests and return with total
    return {
      results: dandisets.filter(
        (d): d is DandisetSearchResultItem => d !== null,
      ),
      total,
    };
  } catch (error) {
    console.error("Error performing semantic search:", error);
    return { results: [], total: 0 };
  }
};

export default doDandiSemanticSearch;
