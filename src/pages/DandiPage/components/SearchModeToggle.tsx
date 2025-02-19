import { FormControlLabel, Stack, Switch, Typography } from "@mui/material";
import { FunctionComponent } from "react";

type SearchModeToggleProps = {
  useSemanticSearch: boolean;
  onSemanticSearchChange: (enabled: boolean) => void;
  useAdvancedSearch: boolean;
  onAdvancedSearchChange: (enabled: boolean) => void;
};

export const SearchModeToggle: FunctionComponent<SearchModeToggleProps> = ({
  useSemanticSearch,
  onSemanticSearchChange,
  useAdvancedSearch,
  onAdvancedSearchChange,
}) => {
  const handleSemanticSearchChange = (enabled: boolean) => {
    if (enabled) {
      onAdvancedSearchChange(false);
    }
    onSemanticSearchChange(enabled);
  };

  const handleAdvancedSearchChange = (enabled: boolean) => {
    if (enabled) {
      onSemanticSearchChange(false);
    }
    onAdvancedSearchChange(enabled);
  };

  return (
    <Stack>
      <Stack direction="row" spacing={2}>
        <FormControlLabel
          control={
            <Switch
              checked={useSemanticSearch}
              onChange={(e) => handleSemanticSearchChange(e.target.checked)}
              disabled={useAdvancedSearch}
            />
          }
          label="Semantic search"
        />
        <FormControlLabel
          control={
            <Switch
              checked={useAdvancedSearch}
              onChange={(e) => handleAdvancedSearchChange(e.target.checked)}
            />
          }
          label="Neurodata types"
        />
      </Stack>
      {useAdvancedSearch && (
        <Typography variant="caption" color="warning.main" sx={{ mt: 0.5 }}>
          Note: Search is limited to the first 100 files in each dandiset
        </Typography>
      )}
    </Stack>
  );
};
