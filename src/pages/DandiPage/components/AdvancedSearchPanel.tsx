import {
  Autocomplete,
  Box,
  Chip,
  CircularProgress,
  TextField,
} from "@mui/material";
import { FunctionComponent } from "react";

type AdvancedSearchPanelProps = {
  neurodataTypes: string[];
  selectedTypes: string[];
  onSelectedTypesChange: (types: string[]) => void;
  loading?: boolean;
  error?: string;
};

export const AdvancedSearchPanel: FunctionComponent<
  AdvancedSearchPanelProps
> = ({
  neurodataTypes,
  selectedTypes,
  onSelectedTypesChange,
  loading,
  error,
}) => {
  if (loading) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, pl: 2 }}>
        <CircularProgress size={20} />
        Loading neurodata types...
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ color: "error.main", pl: 2 }}>
        Error loading neurodata types: {error}
      </Box>
    );
  }

  return (
    <Box sx={{ pl: 2 }}>
      <Autocomplete
        multiple
        value={selectedTypes}
        onChange={(_, newValue) => {
          onSelectedTypesChange(newValue);
        }}
        options={neurodataTypes}
        filterOptions={(options, { inputValue }) => {
          const input = inputValue.toLowerCase();
          return options.filter((option) =>
            option.toLowerCase().startsWith(input),
          );
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Select Neurodata Types"
            placeholder={selectedTypes.length === 0 ? "Type to search..." : ""}
            sx={{ width: "100%", maxWidth: 500 }}
          />
        )}
        renderTags={(tagValue, getTagProps) =>
          tagValue.map((option, index) => (
            <Chip
              {...getTagProps({ index })}
              key={option}
              label={option}
              onDelete={() => {
                const newSelected = selectedTypes.filter((t) => t !== option);
                onSelectedTypesChange(newSelected);
              }}
            />
          ))
        }
      />
    </Box>
  );
};
