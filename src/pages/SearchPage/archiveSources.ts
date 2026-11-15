import getAuthorizationHeaderForUrl from "../util/getAuthorizationHeaderForUrl";
import { buildDandisetsSearchUrl } from "../util/dandisetsSearchUrl";
import {
  getDandiApiHeaders,
  getEmberApiHeaders,
} from "../util/getDandiApiHeaders";
import type {
  DandisetSearchResultItem,
  DandisetsResponse,
} from "../DandiPage/dandi-types";
import doDandiSemanticSearch from "../DandiPage/doDandiSemanticSearch";
import type { NeurodataTypesIndex } from "../DandiPage/fetchNeurodataTypesIndex";
import {
  fetchOpenNeuroPage,
  type OpenNeuroDataset,
} from "../OpenNeuroPage/fetchOpenNeuroDatasets";
import { fetchDatasetInfo } from "../OpenNeuroDatasetPage/openNeuroApi";
import type { Archive, CatalogItem, Order, Page, Source } from "./catalogFeed";

export const PAGE = 25;

const DANDI_LIKE = {
  DANDI: {
    api: "https://api.dandiarchive.org",
    path: "dandiset",
    headers: () => getDandiApiHeaders(false),
  },
  EMBER: {
    api: "https://api-dandi.emberarchive.org",
    path: "ember-dandiset",
    headers: getEmberApiHeaders,
  },
} as const;

/** A Dandiset from DANDI or EMBER as a catalog row. */
export function dandisetItem(
  archive: "DANDI" | "EMBER",
  d: DandisetSearchResultItem & { matching_files_count?: number },
): CatalogItem {
  const version = d.most_recent_published_version ?? d.draft_version;
  return {
    archive,
    id: d.identifier,
    title: version?.name ?? d.identifier,
    path: `${DANDI_LIKE[archive].path}/${d.identifier}`,
    created: d.created,
    modified: d.modified,
    files: version?.asset_count,
    size: version?.size,
    matchingFiles: d.matching_files_count,
    status:
      d.embargo_status && d.embargo_status !== "OPEN"
        ? "Embargoed"
        : d.most_recent_published_version
          ? undefined
          : "Draft",
  };
}

export function openNeuroItem(d: OpenNeuroDataset): CatalogItem {
  const summary = d.latestSnapshot.summary;
  return {
    archive: "OpenNeuro",
    id: d.id,
    title: d.latestSnapshot.description?.Name || d.id,
    path: `openneuro-dataset/${d.id}`,
    created: d.created,
    modified: d.latestSnapshot.created ?? d.created,
    subjects: summary?.subjects.length,
    files: summary?.totalFiles,
    size: d.latestSnapshot.size,
    types: summary?.modalities,
    status: d.public ? undefined : "Private",
  };
}

/** DANDI's API ignores ordering=-created; Dandiset IDs rise with creation, so -id is newest first. */
export const dandiOrdering = (order: Order) =>
  order === "newest" ? "-id" : "-modified";

/** DANDI or EMBER text search, a page of 25 at a time. */
export function dandiSearch(
  archive: "DANDI" | "EMBER",
  query: string,
  order: Order,
): Source {
  let page = 0;
  return {
    archive,
    next: async (): Promise<Page> => {
      page += 1;
      const { headers, apiKeyProvided } = DANDI_LIKE[archive].headers();
      const response = await fetch(
        buildDandisetsSearchUrl({
          apiBaseUrl: DANDI_LIKE[archive].api,
          searchQuery: query,
          embargoed: apiKeyProvided,
          pageSize: PAGE,
          page,
          ordering: dandiOrdering(order),
        }),
        { headers },
      );
      if (!response.ok)
        throw new Error(`${archive} answered ${response.status}`);
      const json = (await response.json()) as DandisetsResponse;
      return {
        items: json.results.map((d) => dandisetItem(archive, d)),
        total: json.count,
        done: !json.next,
      };
    },
  };
}

async function fetchDandiset(id: string) {
  const url = `https://api.dandiarchive.org/api/dandisets/${id}`;
  const authorization = getAuthorizationHeaderForUrl(url);
  const response = await fetch(url, {
    headers: authorization ? { Authorization: authorization } : undefined,
  });
  return response.ok
    ? ((await response.json()) as DandisetSearchResultItem)
    : null;
}

/** DANDI Dandisets by ID, in the given order, read 25 at a time. */
function dandiByIds(
  ids: () => Promise<{ id: string; matchingFiles?: number }[]>,
): Source {
  let all: { id: string; matchingFiles?: number }[] | undefined;
  let offset = 0;
  return {
    archive: "DANDI",
    next: async () => {
      all ??= await ids();
      const slice = all.slice(offset, offset + PAGE);
      offset += PAGE;
      const found = await Promise.all(slice.map((s) => fetchDandiset(s.id)));
      const items = found.flatMap((d, i) =>
        d
          ? [
              dandisetItem("DANDI", {
                ...d,
                matching_files_count: slice[i].matchingFiles,
              }),
            ]
          : [],
      );
      return { items, total: all.length, done: offset >= all.length };
    },
  };
}

export const semanticSearch = (query: string) =>
  dandiByIds(async () =>
    (await doDandiSemanticSearch(query)).map((id) => ({ id })),
  );

/** Dandisets with a file holding every picked type, most matching files first. */
export function typeMatches(index: NeurodataTypesIndex, types: string[]) {
  const counts = new Map<string, number>();
  for (const file of index.files)
    if (types.every((t) => file.neurodata_types.includes(t)))
      counts.set(file.dandiset_id, (counts.get(file.dandiset_id) ?? 0) + 1);
  return [...counts]
    .map(([id, matchingFiles]) => ({ id, matchingFiles }))
    .sort((a, b) => b.matchingFiles - a.matchingFiles);
}

/** How many Dandisets hold each type, most common first. */
export function typeCounts(index: NeurodataTypesIndex) {
  const dandisets = new Map<string, Set<string>>();
  for (const file of index.files)
    for (const type of file.neurodata_types) {
      if (!dandisets.has(type)) dandisets.set(type, new Set());
      dandisets.get(type)!.add(file.dandiset_id);
    }
  return [...dandisets]
    .map(([type, ids]) => ({ type, count: ids.size }))
    .sort((a, b) => b.count - a.count || a.type.localeCompare(b.type));
}

export const typesSearch = (index: NeurodataTypesIndex, types: string[]) =>
  dandiByIds(async () => typeMatches(index, types));

/** OpenNeuro keyword search, a page of 25 at a time. */
export function openNeuroSearch(query: string, order: Order): Source {
  let cursor: string | undefined;
  let total: number | undefined;
  const sortBy =
    order === "modified"
      ? "last_updated"
      : order === "best" && query
        ? "relevance"
        : "newest";
  return {
    archive: "OpenNeuro",
    next: async () => {
      const page = await fetchOpenNeuroPage(query, sortBy, cursor);
      cursor = page.cursor;
      total ??= page.count ?? page.datasets.length;
      return { items: page.datasets.map(openNeuroItem), total, done: !cursor };
    },
  };
}

/** A DANDI or EMBER ID typed exactly: that Dandiset first. */
export function exactId(
  archive: "DANDI" | "EMBER",
  query: string,
): Source | undefined {
  if (!/^\d{6}$/.test(query.trim())) return undefined;
  let read = false;
  return {
    archive,
    next: async () => {
      read = true;
      const response = await fetch(
        `${DANDI_LIKE[archive].api}/api/dandisets/${query.trim()}/`,
        {
          headers: DANDI_LIKE[archive].headers().headers,
        },
      );
      const items = response.ok
        ? [
            dandisetItem(
              archive,
              (await response.json()) as DandisetSearchResultItem,
            ),
          ]
        : [];
      return { items, total: 0, done: read };
    },
  };
}

export const ARCHIVES: Archive[] = ["DANDI", "OpenNeuro", "EMBER"];

/** How many datasets an archive lists, for the search placeholder. */
export async function archiveTotal(archive: Archive): Promise<number> {
  if (archive === "OpenNeuro") {
    const page = await fetchOpenNeuroPage("");
    return page.count ?? page.datasets.length;
  }
  const { headers } = DANDI_LIKE[archive].headers();
  const response = await fetch(
    buildDandisetsSearchUrl({
      apiBaseUrl: DANDI_LIKE[archive].api,
      searchQuery: "",
      embargoed: false,
      pageSize: 1,
    }),
    { headers },
  );
  if (!response.ok) throw new Error(`${archive} answered ${response.status}`);
  return ((await response.json()) as DandisetsResponse).count;
}

/** A Dandiset's or dataset's title, for Recently opened. */
export async function datasetTitle(
  archive: Archive,
  id: string,
): Promise<string | undefined> {
  if (archive === "OpenNeuro")
    return (await fetchDatasetInfo(id))?.snapshot.description.Name;
  const response = await fetch(
    `${DANDI_LIKE[archive].api}/api/dandisets/${id}/`,
    {
      headers: DANDI_LIKE[archive].headers().headers,
    },
  );
  if (!response.ok) return undefined;
  return dandisetItem(
    archive,
    (await response.json()) as DandisetSearchResultItem,
  ).title;
}
