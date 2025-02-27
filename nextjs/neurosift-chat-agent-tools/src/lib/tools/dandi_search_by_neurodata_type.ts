import { fetchNeurodataTypesIndex } from "./fetchNeurodataTypes";

interface SearchResult {
  id: string;
  version: string;
  matching_asset_count: number; // number of matching assets

  // the following are determined by consulting the DANDI API
  name?: string;
  total_asset_count?: number;
  size?: number;
}

interface SearchResponse {
  results: SearchResult[];
  total: number;
}

export async function searchByNeurodataType(types: string[], limit: number = 10): Promise<SearchResponse> {
  const data = await fetchNeurodataTypesIndex();
  if (!data) {
    throw new Error("Failed to fetch neurodata types index");
  }

  // Convert types to lowercase for case-insensitive matching
  const searchTypes = types.map(t => t.toLowerCase());

  // Group files by dandiset and find ones that contain all specified types
  const dandisetMap = new Map<string, SearchResult>();

  data.files.forEach((file) => {
    // Convert file's types to lowercase for matching
    const fileTypes = file.neurodata_types.map(t => t.toLowerCase());

    // Check if file contains all search types
    const hasAllTypes = searchTypes.every(t => fileTypes.includes(t));
    if (!hasAllTypes) return;

    const key = file.dandiset_id;
    if (!dandisetMap.has(key)) {
      dandisetMap.set(key, {
        id: file.dandiset_id,
        version: file.dandiset_version,
        matching_asset_count: 1,
      });
    } else {
      const existing = dandisetMap.get(key)!;
      existing.matching_asset_count++;
    }
  });

  const allResults = Array.from(dandisetMap.values());
  const total = allResults.length;
  const results = allResults.slice(0, limit);

  // fill in the dandiset names by consulting the DANDI api
  for (const result of results) {
    const dandisetId = result.id;
    const url = `https://api.dandiarchive.org/api/dandisets/${dandisetId}/`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`DANDI API error: ${response.statusText}`);
    }
    const item = await response.json();
    let version;
    if (item.most_recent_published_version) {
      version = item.most_recent_published_version;
    } else {
      version = item.draft_version;
    }
    if (!version) {
      console.warn("Failed to get version for dandiset");
      continue;
    }
    result.name = version.name;
    result.total_asset_count = version.asset_count;
    result.size = version.size;
  }

  return { results, total };
}
