export interface DandisetVersion {
  name: string;
  version: string;
  created: string;
  modified: string;
  asset_count: number;
  size: number;
}

export interface DandisetResult {
  identifier: string;
  most_recent_published_version: DandisetVersion | null;
  draft_version: DandisetVersion | null;
  contact_person: string;
  embargo_status: string;
  star_count: number;
}

export interface DandisetApiResponse {
  results: DandisetResult[];
}

export interface DandisetInfo {
  dandiset_id: string;
  version: string;
  name: string;
  created: string;
  modified: string;
  asset_count: number;
  size: number;
  contact_person: string;
  embargo_status: string;
  star_count: number;
}

export interface NwbFileInfo {
  path: string;
  size: number;
  asset_id: string;
}

interface AssetResult {
  path: string;
  size: number;
  asset_id: string;
}

interface AssetApiResponse {
  results: AssetResult[];
}

export async function fetchDandisetsFromApi(search: string = ''): Promise<DandisetInfo[]> {
  let url = 'https://api.dandiarchive.org/api/dandisets/?page=1&page_size=5000&ordering=-modified&draft=true&empty=false&embargoed=false';
  if (search) {
    url += `&search=${encodeURIComponent(search)}`;
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`DANDI API request failed: ${response.statusText}`);
  }

  const data = await response.json() as DandisetApiResponse;
  return data.results.map(ds => {
    const pv = ds.most_recent_published_version;
    const dv = ds.draft_version;
    const vv = pv || dv;

    if (!vv) {
      throw new Error(`No version information for dandiset ${ds.identifier}`);
    }

    return {
      dandiset_id: ds.identifier,
      version: vv.version,
      name: vv.name,
      created: vv.created,
      modified: vv.modified,
      asset_count: vv.asset_count,
      size: vv.size,
      contact_person: ds.contact_person,
      embargo_status: ds.embargo_status,
      star_count: ds.star_count
    };
  });
}

export async function fetchNwbFilesFromApi(dandisetId: string, version: string): Promise<NwbFileInfo[]> {
  const url = `https://api.dandiarchive.org/api/dandisets/${dandisetId}/versions/${version}/assets/?page_size=100&glob=*.nwb`;

  const response = await fetch(url);
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Dandiset ${dandisetId} version ${version} not found`);
    }
    throw new Error(`Failed to fetch NWB files: ${response.statusText}`);
  }

  const data = await response.json() as AssetApiResponse;
  return data.results;
}
