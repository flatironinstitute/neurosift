interface OpenNeuroDataset {
  id: string;
  created: string;
  uploader: {
    id: string;
    name: string;
    orcid: string | null;
  };
  public: boolean;
  latestSnapshot: {
    size: number;
    summary: {
      modalities: string[];
      sessions: string[];
      subjects: string[];
      totalFiles: number;
    };
    description: {
      Name: string;
      Authors: string[];
    };
  };
  analytics: {
    views: number;
    downloads: number;
  };
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

export async function openNeuroSearch(query: string, limit: number = 25): Promise<OpenNeuroDataset[]> {
  const keywords = query
    .split(" ")
    .map((keyword) => keyword.trim())
    .filter((keyword) => keyword.length > 0);

  const graphqlQuery = `query advancedSearchDatasets(
    $query: JSON!,
    $cursor: String,
    $allDatasets: Boolean,
    $datasetType: String,
    $datasetStatus: String,
    $sortBy: JSON
  ) {
    datasets: advancedSearch(
      query: $query,
      allDatasets: $allDatasets,
      datasetType: $datasetType,
      datasetStatus: $datasetStatus,
      sortBy: $sortBy,
      first: ${limit},
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
  }`.split("\n").join(" ");

  const queryBody = keywords.length > 0
    ? {
        bool: {
          must: [
            {
              simple_query_string: {
                query: keywords.join(" + ") + "~",
                fields: [
                  "id^20",
                  "latestSnapshot.readme",
                  "latestSnapshot.description.Name^6",
                  "latestSnapshot.description.Authors^3",
                ],
              },
            },
          ],
        },
      }
    : {
        bool: {},
      };

  const resp = await fetch("https://openneuro.org/crn/graphql", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      operationName: "advancedSearchDatasets",
      variables: {
        query: queryBody,
        sortBy: { created: "desc" },
        allDatasets: false,
        datasetType: "All Public",
        datasetStatus: null,
      },
      query: graphqlQuery,
    }),
  });

  if (!resp.ok) {
    throw new Error("Failed to fetch OpenNeuro datasets");
  }

  const graphQLResponse = await resp.json() as GraphQLResponse;
  return graphQLResponse.data.datasets.edges.map((edge) => edge.node);
}
