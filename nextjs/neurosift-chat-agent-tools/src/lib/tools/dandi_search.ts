/* eslint-disable @typescript-eslint/no-explicit-any */
interface DandiResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: any[];
}

interface DandiSearchResult {
  id: string;
  version: string;
  name: string;
  asset_count: number;
  size: number;
}

export async function dandiSearch(
  query: string,
  limit: number = 10
): Promise<DandiSearchResult[]> {
  const url = `https://api.dandiarchive.org/api/dandisets/`;
  const params = new URLSearchParams({
    page: "1",
    page_size: limit.toString(),
    search: query,
    draft: "false",
    ordering: "-modified",
  });

  const response = await fetch(`${url}?${params}`);
  if (!response.ok) {
    throw new Error(`DANDI API error: ${response.statusText}`);
  }

  const data: DandiResponse = await response.json();
  return data.results.map((item: any) => {
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
    return {
      id: item.identifier,
      name: version.name,
      version: version.version,
      asset_count: version.asset_count,
      size: version.size,
    };
  });
}
