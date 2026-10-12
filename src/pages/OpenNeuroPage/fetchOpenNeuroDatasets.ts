import type { OpenNeuroDataset } from "./OpenNeuroPage";

// Lists public OpenNeuro datasets, newest first. With search text, only the
// datasets that match every word are returned.
//
// The query follows OpenNeuro's DatasetSearchInput type: the search words go
// in `keywords` and the sort order in `sortBy`. Earlier versions of their API
// took an Elasticsearch query object and a separate sortBy argument, and now
// reject both.
const fetchOpenNeuroDatasets = async (
  searchText: string,
): Promise<OpenNeuroDataset[]> => {
  const keywords = searchText
    .split(" ")
    .map((keyword) => keyword.trim())
    .filter((keyword) => keyword.length > 0);

  const query = `query advancedSearchDatasets(
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

  const resp = await fetch("https://openneuro.org/crn/graphql", {
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      operationName: "advancedSearchDatasets",
      variables: {
        query: {
          sortBy: "newest",
          ...(keywords.length > 0 ? { keywords } : {}),
        },
        allDatasets: false,
        datasetType: "All Public",
        datasetStatus: null,
      },
      query,
    }),
    method: "POST",
  });

  if (!resp.ok) {
    throw new Error("Failed to fetch OpenNeuro datasets");
  }
  interface GraphQLResponse {
    data: {
      datasets: {
        edges: Array<{
          node: OpenNeuroDataset;
        }>;
      };
    };
  }

  const graphQLResponse = (await resp.json()) as GraphQLResponse;
  return graphQLResponse.data.datasets.edges.map((edge) => edge.node);
};

export default fetchOpenNeuroDatasets;
