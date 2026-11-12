import {
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
} from "@mui/material";
import { FunctionComponent } from "react";

export type SearchMode =
  | "basic"
  | "semantic"
  | "neurodata-types"
  | "experimental";

type SearchModeControlProps = {
  searchMode: SearchMode;
  setSearchMode: (mode: SearchMode) => void;
};

export const SearchModeControl: FunctionComponent<SearchModeControlProps> = ({
  searchMode,
  setSearchMode,
}) => {
  return (
    <FormControl component="fieldset">
      <RadioGroup
        value={searchMode}
        onChange={(e) => setSearchMode(e.target.value as SearchMode)}
        row
        sx={{ flexWrap: "wrap" }}
      >
        <FormControlLabel
          value="basic"
          control={<Radio size="small" />}
          label="Basic Search"
        />
      </RadioGroup>
    </FormControl>
  );
};
