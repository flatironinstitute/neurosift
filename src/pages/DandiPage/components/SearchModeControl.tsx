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
        <FormControlLabel
          value="semantic"
          control={<Radio size="small" />}
          label="Semantic Search"
        />
        <FormControlLabel
          value="neurodata-types"
          control={<Radio size="small" />}
          label="Neurodata Types Search"
        />
        {/* <FormControlLabel
          value="experimental"
          control={<Radio size="small" />}
          label="Experimental Search"
        /> */}
      </RadioGroup>
    </FormControl>
  );
};
