import ScrollY from "@components/ScrollY";
import HistoryIcon from "@mui/icons-material/History";
import LaunchIcon from "@mui/icons-material/Launch";
import SearchIcon from "@mui/icons-material/Search";
import {
  Box,
  Button,
  Chip,
  Container,
  Link,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { FunctionComponent, useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AIRegisteredComponent, useAIComponentRegistry } from "../../AIContext";
import { getEmberApiHeaders } from "../util/getDandiApiHeaders";
import { getRecentEmberDandisets } from "../util/recentEmberDandisets";
import EmberDandisetSearchResult from "./EmberDandisetSearchResult.tsx";
import { NeurodataTypesSearchPanel } from "./components/NeurodataTypesSearchPanel";
import { SearchMode, SearchModeControl } from "./components/SearchModeControl";
import { DandisetSearchResultItem, DandisetsResponse } from "./dandi-types";
import { useNeurodataTypesIndex } from "./hooks/useNeurodataTypesIndex";
import { useDandisetNotebooks } from "./hooks/useDandisetNotebooks";
import { ExperimentalSearchPanel } from "./experimentalSearch/ExperimentalSearchPanel";
import getAuthorizationHeaderForUrl from "../util/getAuthorizationHeaderForUrl";

type DandiPageProps = {
  width: number;
  height: number;
};

type SearchState = {
  searchText: string;
  searchMode: SearchMode;
  currentLimit: number;
  scheduledSearch: boolean;
};

const EmberDandiPage: FunctionComponent<DandiPageProps> = ({
  width,
  height,
}) => {
  const navigate = useNavigate();
  const [recentEmberDandisets, setRecentEmberDandisets] = useState<string[]>(
    [],
  );
  const staging = false;
  const [searchResults, setSearchResults] = useState<
    DandisetSearchResultItem[]
  >([]);
  const [totalResults, setTotalResults] = useState<number>(0);
  const [isSearching, setIsSearching] = useState(false);
  const [lastSearchedText, setLastSearchedText] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [searchState, setSearchState] = useState<SearchState>({
    searchText: "",
    searchMode: "basic",
    currentLimit: 10,
    scheduledSearch: false,
  });

  // Get notebook URLs for all dandisets
  const { notebookUrls } = useDandisetNotebooks();

  const { searchText, searchMode } = searchState;
  // TODO: eventually re-enable these
  const useNeurodataTypesSearch = false;
  const useSemanticSearch = false;
  const useExperimentalSearch = false;
  const setSearchMode = useCallback((mode: SearchMode) => {
    setSearchState((prev) => ({
      ...prev,
      searchMode: mode,
      searchText: "",
      scheduledSearch: true,
    }));
  }, []);

  const {
    index,
    uniqueTypes,
    loading: loadingTypes,
    error: typesError,
  } = useNeurodataTypesIndex(useNeurodataTypesSearch);

  const performSearch = useCallback(
    async (searchState: SearchState) => {
      const {
        searchText: searchQuery,
        searchMode,
        currentLimit: limit,
      } = searchState;
      setIsSearching(true);
      setSearchResults([]); // Clear results before new search

      const searchResultDandisetIds: string[] = [];
      try {
        if (searchMode === "basic") {
          const { headers, apiKeyProvided } = getEmberApiHeaders();
          const embargoedStr = apiKeyProvided ? "true" : "false";
          // const stagingStr = staging ? "-staging" : "";
          const emptyStr = !searchQuery ? "false" : "true";

          // TODO - should we support sandbox at all? Doesn't seem to be working as well there
          const response = await fetch(
            `https://api-dandi.emberarchive.org/api/dandisets/?page=1&page_size=50&ordering=-modified&search=${searchQuery}&draft=true&empty=${emptyStr}&embargoed=${embargoedStr}`,
            { headers },
          );
          if (response.status === 200) {
            const json = await response.json();
            const dandisetResponse = json as DandisetsResponse;
            setSearchResults(dandisetResponse.results);
          }
        }
        if (searchResultDandisetIds && searchResultDandisetIds.length > 0) {
          // Limit to a few results and fetch full dandiset info for each
          // Return total count along with the paginated results

          const dandisets0 = await Promise.all(
            searchResultDandisetIds
              .slice(0, limit)
              .map(async (dandisetId: string) => {
                const url = `https://api-dandi.emberarchive.org/api/dandisets/${dandisetId}`;
                const authorizationHeader = getAuthorizationHeaderForUrl(url);
                const headers = authorizationHeader
                  ? { Authorization: authorizationHeader }
                  : undefined;

                try {
                  const response = await fetch(url, { headers });
                  if (response.status === 200) {
                    const json = await response.json();
                    return json as DandisetSearchResultItem;
                  }
                } catch (error) {
                  console.error(
                    "Error fetching EMBER Dandiset details:",
                    error,
                  );
                }
                return null;
              }),
          );

          // Filter out any failed requests and return with total
          const dandisetsFilt = dandisets0.filter(
            (
              d: DandisetSearchResultItem | null,
            ): d is DandisetSearchResultItem => d !== null,
          ) as DandisetSearchResultItem[];
          setSearchResults(dandisetsFilt);
          const total = searchResultDandisetIds.length;
          setTotalResults(total);
        }
      } catch (error) {
        console.error("Error fetching results:", error);
      } finally {
        setIsSearching(false);
        setLastSearchedText(searchQuery);
      }
    },
    [index, selectedTypes, staging, useNeurodataTypesSearch],
  );

  useRegisterAIComponent();

  useEffect(() => {
    if (searchText) return;
    if (searchMode === "basic") {
      setSearchState((prev) => ({ ...prev, scheduledSearch: true }));
    } else {
      setSearchResults([]);
      setTotalResults(0);
    }
    setRecentEmberDandisets(getRecentEmberDandisets());
  }, [searchText, searchMode]);

  // Reset limit and results when switching search modes
  useEffect(() => {
    setSearchState((prev) => ({ ...prev, currentLimit: 10 }));
    setSearchResults([]);
    setTotalResults(0);
    // Clear selected types when neurodata-types search is disabled
    if (searchMode !== "neurodata-types") {
      setSelectedTypes([]);
    }
  }, [searchMode]);

  // Trigger search when types are selected in neurodata-types mode
  useEffect(() => {
    if (useNeurodataTypesSearch && selectedTypes.length > 0) {
      setSearchState((prev) => ({ ...prev, scheduledSearch: true }));
    }
  }, [selectedTypes, useNeurodataTypesSearch]);

  const handleRecentClick = (dandisetId: string) => {
    navigate(`/ember-dandiset/${dandisetId}`);
  };

  const handleSearch = useCallback(() => {
    if (!useNeurodataTypesSearch || selectedTypes.length > 0) {
      setSearchState((prev) => ({
        ...prev,
        currentLimit: 10,
        scheduledSearch: true,
      }));
    } else {
      setSearchState((prev) => ({ ...prev, scheduledSearch: true }));
    }
  }, [useNeurodataTypesSearch, selectedTypes]);

  const handleViewMore = useCallback(() => {
    setSearchState((prev) => ({
      ...prev,
      currentLimit: prev.currentLimit + 30,
      scheduledSearch: true,
    }));
  }, []);

  useEffect(() => {
    if (searchState.scheduledSearch) {
      setSearchState((prev) => ({ ...prev, scheduledSearch: false }));
      performSearch(searchState);
    }
  }, [searchState, performSearch]);

  const setSearchResultDandisetIds = useCallback(
    async (searchResultDandisetIds: string[]) => {
      setSearchResults([]);
      setTotalResults(0);
      const dandisets = await Promise.all(
        searchResultDandisetIds
          .slice(0, searchState.currentLimit)
          .map(async (dandisetId) => {
            const url = `https://api-dandi.emberarchive.org/api/dandisets/${dandisetId}`;
            const authorizationHeader = getAuthorizationHeaderForUrl(url);
            const headers = authorizationHeader
              ? { Authorization: authorizationHeader }
              : undefined;

            try {
              const response = await fetch(url, { headers });
              if (response.status === 200) {
                const json = await response.json();
                return json as DandisetSearchResultItem;
              }
            } catch (error) {
              console.error("Error fetching dandiset details:", error);
            }
            return null;
          }),
      );

      // Filter out any failed requests and set results
      const dandisetsFilt = dandisets.filter(
        (d): d is DandisetSearchResultItem => d !== null,
      ) as DandisetSearchResultItem[];
      setSearchResults(dandisetsFilt);
      setTotalResults(searchResultDandisetIds.length);
    },
    [searchState.currentLimit],
  );

  return (
    <ScrollY width={width} height={height}>
      <Container maxWidth="xl" sx={{ mt: 2 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          EMBER Archive Browser
        </Typography>
        <Box sx={{ mb: 2 }}>
          <Link
            href="https://dandi.emberarchive.org/"
            sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
          >
            Visit EMBER Archive website <LaunchIcon sx={{ fontSize: 16 }} />
          </Link>
        </Box>
        {recentEmberDandisets.length > 0 && (
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
                {recentEmberDandisets.map((id: string) => (
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
        <Box sx={{ mb: 1 }}>
          <SearchModeControl
            searchMode={searchMode}
            setSearchMode={setSearchMode}
          />
        </Box>
        {useNeurodataTypesSearch && (
          <Box sx={{ mb: 2 }}>
            <NeurodataTypesSearchPanel
              neurodataTypes={uniqueTypes}
              selectedTypes={selectedTypes}
              onSelectedTypesChange={setSelectedTypes}
              loading={loadingTypes}
              error={typesError}
            />
          </Box>
        )}
        {useExperimentalSearch && (
          <Box sx={{ mb: 2 }}>
            <ExperimentalSearchPanel
              setDandisetIds={setSearchResultDandisetIds}
            />
          </Box>
        )}
        {!useNeurodataTypesSearch && !useExperimentalSearch && (
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
              placeholder="Search for EMBER Dandisets..."
              value={searchText}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setSearchState({ ...searchState, searchText: e.target.value })
              }
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                if (e.key === "Enter") {
                  handleSearch();
                }
              }}
            />
          </Box>
        )}
        <Box>
          {searchResults.map((result: DandisetSearchResultItem) => (
            <EmberDandisetSearchResult
              dandiset={result}
              key={result.identifier}
              notebookUrls={notebookUrls[result.identifier]}
            />
          ))}
          {(useSemanticSearch ||
            useNeurodataTypesSearch ||
            useExperimentalSearch) &&
            searchResults.length > 0 &&
            searchResults.length < totalResults && (
              <Box
                sx={{ display: "flex", justifyContent: "center", mt: 2, mb: 2 }}
              >
                <Button variant="outlined" onClick={handleViewMore}>
                  View More ({searchResults.length} of {totalResults})
                </Button>
              </Box>
            )}
        </Box>
      </Container>
    </ScrollY>
  );
};

const useRegisterAIComponent = () => {
  const { registerComponentForAI, unregisterComponentForAI } =
    useAIComponentRegistry();
  useEffect(() => {
    const context = `
The user is viewing the EMBER page where they can search for EMBER Dandisets.
They can either perform a text search, a semantic search, or search by neurodata types.
A text search will return exact matches for the provided text.
A semantic search will return EMBER Dandisets with similar content to the provided text.
A neurodata-types search will return EMBER Dandisets that match the selected neurodata types.
`;
    const registration: AIRegisteredComponent = {
      id: "EmberDandiPage",
      context,
      callbacks: [],
    };
    registerComponentForAI(registration);
    return () => unregisterComponentForAI("EmberDandiPage");
  }, [registerComponentForAI, unregisterComponentForAI]);
};

export default EmberDandiPage;
