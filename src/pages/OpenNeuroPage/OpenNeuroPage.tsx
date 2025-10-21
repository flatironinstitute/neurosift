import {
  Container,
  Typography,
  Box,
  TextField,
  Button,
  Chip,
  Stack,
  Link,
} from "@mui/material";
import LaunchIcon from "@mui/icons-material/Launch";
import SearchIcon from "@mui/icons-material/Search";
import HistoryIcon from "@mui/icons-material/History";
import { FunctionComponent, useCallback, useEffect, useState } from "react";
import { useAIComponentRegistry } from "../../AIContext";
import ScrollY from "@components/ScrollY";
import OpenNeuroDatasetResult from "./OpenNeuroDatasetResult";
import { getRecentOpenNeuroDatasets } from "../util/recentOpenNeuroDatasets";
import { useNavigate } from "react-router-dom";

type OpenNeuroPageProps = {
  width: number;
  height: number;
};

export type OpenNeuroDataset = {
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
};

const fetchONDatasets = async (
  searchText: string,
): Promise<OpenNeuroDataset[]> => {
  const keywords = searchText
    .split(" ")
    .map((keyword) => keyword.trim())
    .filter((keyword) => keyword.length > 0);

  const query = `query advancedSearchDatasets(
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
  }`
    .split("\n")
    .join("\\n");

  const qq =
    keywords.length > 0
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
    headers: {
      "content-type": "application/json",
    },
    body: `{"operationName":"advancedSearchDatasets","variables":{"query":${JSON.stringify(qq)},"sortBy":{"created":"desc"},"allDatasets":false,"datasetType":"All Public","datasetStatus":null},"query":"${query}"}`,
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

type SearchState = {
  searchText: string;
  currentLimit: number;
  scheduledSearch: boolean;
};

const OpenNeuroPage: FunctionComponent<OpenNeuroPageProps> = ({
  width,
  height,
}) => {
  const navigate = useNavigate();
  const [searchState, setSearchState] = useState<SearchState>({
    searchText: "",
    currentLimit: 25,
    scheduledSearch: false,
  });
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<OpenNeuroDataset[]>([]);
  const [lastSearchedText, setLastSearchedText] = useState("");
  const [recentDatasets, setRecentDatasets] = useState<string[]>([]);

  const { searchText } = searchState;

  const performSearch = useCallback(async (searchState: SearchState) => {
    setIsSearching(true);
    setSearchResults([]);
    try {
      const results = await fetchONDatasets(searchState.searchText);
      setSearchResults(results);
    } catch (error) {
      console.error("Error fetching results:", error);
    } finally {
      setIsSearching(false);
      setLastSearchedText(searchState.searchText);
    }
  }, []);

  useEffect(() => {
    if (searchText) return;
    setSearchState((prev: SearchState) => ({ ...prev, scheduledSearch: true }));
    setRecentDatasets(getRecentOpenNeuroDatasets());
  }, [searchText]);

  useEffect(() => {
    if (searchState.scheduledSearch) {
      setSearchState((prev: SearchState) => ({
        ...prev,
        scheduledSearch: false,
      }));
      performSearch(searchState);
    }
  }, [searchState, performSearch]);

  const handleRecentClick = (datasetId: string) => {
    navigate(`/openneuro-dataset/${datasetId}`);
  };

  const handleSearch = useCallback(() => {
    setSearchState((prev: SearchState) => ({
      ...prev,
      scheduledSearch: true,
    }));
  }, []);

  useRegisterAIComponent({
    searchState,
    searchResults,
    isSearching,
    lastSearchedText,
  });

  return (
    <ScrollY width={width} height={height}>
      <Container maxWidth="xl" sx={{ mt: 2 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          OpenNeuro Browser
        </Typography>
        <Box sx={{ mb: 2 }}>
          <Link
            href="https://openneuro.org/"
            sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
          >
            Visit OpenNeuro website <LaunchIcon sx={{ fontSize: 16 }} />
          </Link>
        </Box>
        {recentDatasets.length > 0 && (
          <Box sx={{ mb: 0.5 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <HistoryIcon fontSize="small" color="action" />
              <Typography variant="body2" color="text.secondary">
                Recent:
              </Typography>
              <Stack
                direction="row"
                spacing={1}
                sx={{ flexWrap: "wrap", gap: 1 }}
              >
                {recentDatasets.map((id: string) => (
                  <Chip
                    key={id}
                    label={id}
                    size="small"
                    onClick={() => handleRecentClick(id)}
                    sx={{
                      cursor: "pointer",
                      "&:hover": {
                        backgroundColor: "rgba(0, 0, 0, 0.08)",
                      },
                    }}
                  />
                ))}
              </Stack>
            </Stack>
          </Box>
        )}
        <Box sx={{ display: "flex", gap: 1, mb: 2, position: "relative" }}>
          <Button
            size="small"
            variant="contained"
            onClick={() => !isSearching && handleSearch()}
            disabled={isSearching}
            sx={{
              minWidth: 40,
              borderRadius: 2,
              boxShadow: "none",
              opacity: isSearching ? 0.6 : 1,
              "&:hover": {
                boxShadow: "none",
              },
            }}
          >
            <SearchIcon />
          </Button>
          <TextField
            fullWidth
            size="small"
            variant="outlined"
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: 2,
                backgroundColor:
                  searchText !== lastSearchedText
                    ? "rgba(0, 0, 0, 0.02)"
                    : "transparent",
                "& fieldset": {
                  borderColor: "rgba(0, 0, 0, 0.15)",
                },
              },
            }}
            placeholder="Search OpenNeuro datasets..."
            value={searchText}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setSearchState((prev: SearchState) => ({
                ...prev,
                searchText: e.target.value,
              }))
            }
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
              if (e.key === "Enter") {
                handleSearch();
              }
            }}
          />
        </Box>
        <Box>
          {searchResults.map((result) => (
            <OpenNeuroDatasetResult dataset={result} key={result.id} />
          ))}
        </Box>
      </Container>
    </ScrollY>
  );
};

const useRegisterAIComponent = ({
  searchState,
  searchResults,
  isSearching,
  lastSearchedText,
}: {
  searchState: SearchState;
  searchResults: OpenNeuroDataset[];
  isSearching: boolean;
  lastSearchedText: string;
}) => {
  const { registerComponentForAI, unregisterComponentForAI } =
    useAIComponentRegistry();
  useEffect(() => {
    const context = `
The user is viewing the OpenNeuroPage where they can search for OpenNeuro datasets.
${isSearching ? "The page is currently performing a search." : ""}
${searchState.searchText ? `Current search text: "${searchState.searchText}"` : "No search text entered."}
${lastSearchedText ? `Last searched text: "${lastSearchedText}"` : ""}
${searchResults.length > 0 ? `Found ${searchResults.length} datasets:` : "No search results yet."}
${searchResults
  .slice(0, 10)
  .map(
    (dataset) => `
  - Dataset ${dataset.id}:
    Name: ${dataset.latestSnapshot.description.Name}
    Authors: ${dataset.latestSnapshot.description.Authors.join(", ")}
    Files: ${dataset.latestSnapshot.summary?.totalFiles}
    Modalities: ${dataset.latestSnapshot.summary?.modalities.join(", ")}
`,
  )
  .join("")}

The user can interact with the page by:
- Entering search text in the search box
- Clicking the search button or pressing Enter to perform a search
- Clicking on recent datasets to view them
- Clicking on search results to view dataset details
`;
    const registration = {
      id: "OpenNeuroPage",
      context,
      callbacks: [],
    };
    registerComponentForAI(registration);
    return () => unregisterComponentForAI("OpenNeuroPage");
  }, [
    registerComponentForAI,
    unregisterComponentForAI,
    searchState,
    searchResults,
    isSearching,
    lastSearchedText,
  ]);
};

export default OpenNeuroPage;
