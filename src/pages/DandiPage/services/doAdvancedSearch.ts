import { NeurodataTypesIndex } from "../fetchNeurodataTypesIndex";
import { DandisetAdvancedSearchResult } from "../dandi-types";
import getAuthorizationHeaderForUrl from "../../util/getAuthorizationHeaderForUrl";

export const doAdvancedSearch = async (
  index: NeurodataTypesIndex,
  selectedTypes: string[],
  limit: number = 10,
): Promise<{ results: DandisetAdvancedSearchResult[]; total: number }> => {
  try {
    // Find unique dandiset IDs and count matching files
    const dandisetIds = new Set<string>();
    const matchingFileCounts = new Map<string, number>();

    // Find dandisets with matching files and count them
    for (const file of index.files) {
      const hasAllTypes = selectedTypes.every((type) =>
        file.neurodata_types.includes(type),
      );
      if (hasAllTypes) {
        dandisetIds.add(file.dandiset_id);
        matchingFileCounts.set(
          file.dandiset_id,
          (matchingFileCounts.get(file.dandiset_id) || 0) + 1,
        );
      }
    }

    const dandisetIdsArray = Array.from(dandisetIds);
    const total = dandisetIdsArray.length;

    // Fetch full dandiset info for the paginated results
    const dandisets = await Promise.all(
      dandisetIdsArray.slice(0, limit).map(async (dandisetId) => {
        const url = `https://api.dandiarchive.org/api/dandisets/${dandisetId}`;
        const authorizationHeader = getAuthorizationHeaderForUrl(url);
        const headers = authorizationHeader
          ? { Authorization: authorizationHeader }
          : undefined;

        try {
          const response = await fetch(url, { headers });
          if (response.status === 200) {
            const json = await response.json();
            const result = json as DandisetAdvancedSearchResult;
            result.matching_files_count = matchingFileCounts.get(dandisetId);
            return result;
          }
        } catch (error) {
          console.error("Error fetching dandiset details:", error);
        }
        return null;
      }),
    );

    // Filter out any failed requests
    return {
      results: dandisets.filter(
        (d): d is DandisetAdvancedSearchResult => d !== null,
      ),
      total,
    };
  } catch (error) {
    console.error("Error performing advanced search:", error);
    return { results: [], total: 0 };
  }
};
