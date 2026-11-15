// Lists public OpenNeuro datasets a page at a time. With search text, only the
// datasets that match every word are returned.
//
// The query follows OpenNeuro's DatasetSearchInput type: the search words go
// in `keywords` and the sort order in `sortBy`. Earlier versions of their API
// took an Elasticsearch query object and a separate sortBy argument, and now
// reject both.

export type OpenNeuroDataset = {
  id: string;
  created: string;
  uploader: { id: string; name: string; orcid: string | null };
  public: boolean;
  latestSnapshot: {
    created?: string;
    tag?: string;
    size: number;
    summary: {
      modalities: string[];
      sessions: string[];
      subjects: string[];
      totalFiles: number;
    } | null;
    description: { Name: string; Authors: string[] };
  };
  analytics: { views: number; downloads: number };
};

export type OpenNeuroSort = "newest" | "last_updated" | "relevance";

export type OpenNeuroPage = {
  datasets: OpenNeuroDataset[];
  /** How many datasets match in all, when OpenNeuro says. */
  count?: number;
  /** Where the next page starts; absent on the last page. */
  cursor?: string;
};

const QUERY = `query advancedSearchDatasets(
    $query: DatasetSearchInput!,
    $cursor: String,
    $allDatasets: Boolean,
    $datasetType: String,
    $datasetStatus: String
  ) {
    datasets: advancedSearch(
      query: $query,
      allDatasets: $allDatasets,
      datasetType: $datasetType,
      datasetStatus: $datasetStatus,
      first: 25,
      after: $cursor
    ) {
      pageInfo {
        hasNextPage
        endCursor
        count
      }
      edges {
        node {
          id
          created
          uploader {
            id
            name
            orcid
          }
          public
          latestSnapshot {
            created
            tag
            size
            summary {
              modalities
              sessions
              subjects
              totalFiles
            }
            description {
              Name
              Authors
            }
          }
          analytics {
            views
            downloads
          }
        }
      }
    }
  }`;

export const fetchOpenNeuroPage = async (
  searchText: string,
  sortBy: OpenNeuroSort = "newest",
  cursor?: string,
): Promise<OpenNeuroPage> => {
  const keywords = searchText
    .split(" ")
    .map((keyword) => keyword.trim())
    .filter((keyword) => keyword.length > 0);

  const resp = await fetch("https://openneuro.org/crn/graphql", {
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      operationName: "advancedSearchDatasets",
      variables: {
        query: {
          sortBy,
          ...(keywords.length > 0 ? { keywords } : {}),
        },
        cursor,
        allDatasets: false,
        datasetType: "All Public",
        datasetStatus: null,
      },
      query: QUERY,
    }),
    method: "POST",
  });

  if (!resp.ok) {
    throw new Error("Failed to fetch OpenNeuro datasets");
  }
  type GraphQLResponse = {
    data: {
      datasets: {
        pageInfo?: { hasNextPage: boolean; endCursor: string; count: number };
        edges: ({ node: OpenNeuroDataset | null } | null)[];
      };
    };
  };
  const { datasets } = ((await resp.json()) as GraphQLResponse).data;
  return {
    // A deleted dataset comes back as a null node with an error beside the rest.
    datasets: datasets.edges.flatMap((edge) => (edge?.node ? [edge.node] : [])),
    count: datasets.pageInfo?.count,
    cursor: datasets.pageInfo?.hasNextPage
      ? datasets.pageInfo.endCursor
      : undefined,
  };
};

/** The first page, newest first. */
const fetchOpenNeuroDatasets = async (
  searchText: string,
): Promise<OpenNeuroDataset[]> =>
  (await fetchOpenNeuroPage(searchText)).datasets;

export default fetchOpenNeuroDatasets;
