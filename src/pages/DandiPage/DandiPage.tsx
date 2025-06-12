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
import { getDandiApiHeaders } from "../util/getDandiApiHeaders";
import { getRecentDandisets } from "../util/recentDandisets";
import DandisetSearchResult from "./DandisetSearchResult";
import { NeurodataTypesSearchPanel } from "./components/NeurodataTypesSearchPanel";
import { SearchMode, SearchModeControl } from "./components/SearchModeControl";
import { DandisetSearchResultItem, DandisetsResponse } from "./dandi-types";
import doDandiSemanticSearch from "./doDandiSemanticSearch";
import { useNeurodataTypesIndex } from "./hooks/useNeurodataTypesIndex";
import { useDandisetNotebooks } from "./hooks/useDandisetNotebooks";
import { doNeurodataTypesSearch } from "./services/doNeurodataTypesSearch";
import { ExperimentalSearchPanel } from "./components/ExperimentalSearchPanel";

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

const DandiPage: FunctionComponent<DandiPageProps> = ({ width, height }) => {
  const navigate = useNavigate();
  const [recentDandisets, setRecentDandisets] = useState<string[]>([]);
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
  const useNeurodataTypesSearch = searchMode === "neurodata-types";
  const useSemanticSearch = searchMode === "semantic";
  const useExperimentalSearch = searchMode === "experimental";
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

      try {
        if (useNeurodataTypesSearch && index) {
          if (selectedTypes.length === 0) {
            setTotalResults(0);
            return;
          }
          const { results, total } = await doNeurodataTypesSearch(
            index,
            selectedTypes,
            limit,
          );
          setSearchResults(results);
          setTotalResults(total);
        } else if (searchMode === "semantic") {
          const { results, total } = await doDandiSemanticSearch(
            searchQuery,
            limit,
          );
          setSearchResults(results);
          setTotalResults(total);
        } else if (searchMode === "basic") {
          const { headers, apiKeyProvided } = getDandiApiHeaders(staging);
          const embargoedStr = apiKeyProvided ? "true" : "false";
          const stagingStr = staging ? "-staging" : "";
          const emptyStr = !searchQuery ? "false" : "true";

          const response = await fetch(
            `https://api${stagingStr}.dandiarchive.org/api/dandisets/?page=1&page_size=50&ordering=-modified&search=${searchQuery}&draft=true&empty=${emptyStr}&embargoed=${embargoedStr}`,
            { headers },
          );
          if (response.status === 200) {
            const json = await response.json();
            const dandisetResponse = json as DandisetsResponse;
            setSearchResults(dandisetResponse.results);
          }
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
    setRecentDandisets(getRecentDandisets());
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
    navigate(`/dandiset/${dandisetId}`);
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

  return (
    <ScrollY width={width} height={height}>
      <Container maxWidth="xl" sx={{ mt: 2 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          DANDI Archive Browser
        </Typography>
        <Box sx={{ mb: 2 }}>
          <Link
            href="https://dandiarchive.org/"
            sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
          >
            Visit DANDI Archive website <LaunchIcon sx={{ fontSize: 16 }} />
          </Link>
        </Box>
        {recentDandisets.length > 0 && (
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
                {recentDandisets.map((id: string) => (
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
            <ExperimentalSearchPanel />
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
              placeholder="Search for Dandisets..."
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
            <DandisetSearchResult
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
The user is viewing the Dandi page where they can search for Dandisets.
They can either perform a text search, a semantic search, or search by neurodata types.
A text search will return exact matches for the provided text.
A semantic search will return Dandisets with similar content to the provided text.
An neuroda-types search will return Dandisets that match the selected neurodata types.
`;
    const registration: AIRegisteredComponent = {
      id: "DandiPage",
      context,
      callbacks: [],
    };
    registerComponentForAI(registration);
    return () => unregisterComponentForAI("DandiPage");
  }, [registerComponentForAI, unregisterComponentForAI]);
};

export default DandiPage;
