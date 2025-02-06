import {
  Container,
  Typography,
  Box,
  TextField,
  Button,
  Chip,
  Stack,
  FormControlLabel,
  Switch,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import HistoryIcon from "@mui/icons-material/History";
import DandisetSearchResult from "./DandisetSearchResult";
import { DandisetSearchResultItem, DandisetsResponse } from "./dandi-types";
import { FunctionComponent, useCallback, useEffect, useState } from "react";
import { getDandiApiHeaders } from "../util/getDandiApiHeaders";
import { getRecentDandisets } from "../util/recentDandisets";
import { useNavigate } from "react-router-dom";
import ScrollY from "../../components/ScrollY";
import doDandiSemanticSearch from "./doDandiSemanticSearch";

type DandiPageProps = {
  width: number;
  height: number;
};

const DandiPage: FunctionComponent<DandiPageProps> = ({ width, height }) => {
  const navigate = useNavigate();
  const [recentDandisets, setRecentDandisets] = useState<string[]>([]);
  const staging = false;
  const [searchResults, setSearchResults] = useState<
    DandisetSearchResultItem[]
  >([]);
  const [searchText, setSearchText] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [lastSearchedText, setLastSearchedText] = useState("");
  const [useSemanticSearch, setUseSemanticSearch] = useState(false);

  const performSearch = useCallback(
    async (searchQuery: string) => {
      setIsSearching(true);
      setSearchResults([]); // Clear results before new search
      const { headers, apiKeyProvided } = getDandiApiHeaders(staging);
      const embargoedStr = apiKeyProvided ? "true" : "false";
      const stagingStr = staging ? "-staging" : "";
      const emptyStr = !searchQuery ? "false" : "true";

      try {
        if (useSemanticSearch) {
          const semanticResults = await doDandiSemanticSearch(searchQuery);
          setSearchResults(semanticResults);
        } else {
          const response = await fetch(
            `https://api${stagingStr}.dandiarchive.org/api/dandisets/?page=1&page_size=50&ordering=-modified&search=${searchQuery}&draft=true&empty=${emptyStr}&embargoed=${embargoedStr}`,
            {
              headers,
            },
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
    [staging, useSemanticSearch],
  );

  // Perform initial search with empty string when component mounts
  useEffect(() => {
    if (searchText) return;
    if (useSemanticSearch) {
      setSearchResults([]);
    } else {
      performSearch("");
    }
    setRecentDandisets(getRecentDandisets());
  }, [performSearch, useSemanticSearch, searchText]);

  const handleRecentClick = (dandisetId: string) => {
    navigate(`/dandiset/${dandisetId}`);
  };
  return (
    <ScrollY width={width} height={height}>
      <Container maxWidth="xl" sx={{ mt: 2 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          DANDI Archive Browser
        </Typography>
        <Typography variant="body1" sx={{ mb: 1 }}>
          Browse and visualize datasets from the DANDI neuroscience data
          archive.
        </Typography>
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
          <FormControlLabel
            control={
              <Switch
                checked={useSemanticSearch}
                onChange={(e) => setUseSemanticSearch(e.target.checked)}
              />
            }
            label="Use semantic search"
          />
        </Box>
        <Box sx={{ display: "flex", gap: 1, mb: 2, position: "relative" }}>
          <Button
            size="small"
            variant="contained"
            onClick={() => !isSearching && performSearch(searchText)}
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
              setSearchText(e.target.value)
            }
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
              if (e.key === "Enter") {
                performSearch(searchText);
              }
            }}
          />
        </Box>
        <Box>
          {searchResults.map((result: DandisetSearchResultItem) => (
            <DandisetSearchResult dandiset={result} key={result.identifier} />
          ))}
        </Box>
      </Container>
    </ScrollY>
  );
};

export default DandiPage;
