interface DandiAPIAsset {
  asset_id: string;
  path: string;
  size: number;
  blob: string;
  zarr: string | null;
  created: string;
  modified: string;
}

interface DandiAPIResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: DandiAPIAsset[];
}

interface DandisetAsset {
  count: number;
  results: Array<{
    asset_id: string;
    path: string;
    size: number;
  }>;
}

export async function getDandisetAssets(
  dandisetId: string,
  version: string = "draft",
  page: number = 1,
  pageSize: number = 20,
  glob?: string
): Promise<DandisetAsset> {
  let url = `https://api.dandiarchive.org/api/dandisets/${dandisetId}/versions/${version}/assets/?order=path&page=${page}&page_size=${pageSize}&metadata=false&zarr=false`;

  if (glob) {
    url += `&glob=${encodeURIComponent(glob)}`;
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`DANDI API error: ${response.statusText}`);
  }

  const data = await response.json() as DandiAPIResponse;

  return {
    count: data.count,
    results: data.results.map((asset) => ({
      asset_id: asset.asset_id,
      path: asset.path,
      size: asset.size
    }))
  };
}
