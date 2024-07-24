import { Autocomplete, Chip, TextField } from "@mui/material";
import React, { FunctionComponent } from "react";

type NeurodataTypesSelectorProps = {
  allNeurodataTypes: string[];
  selectedNeurodataTypes: string[];
  setSelectedNeurodataTypes: (selectedNeurodataTypes: string[]) => void;
};

const NeurodataTypesSelector: FunctionComponent<NeurodataTypesSelectorProps> = ({
  allNeurodataTypes,
  selectedNeurodataTypes,
  setSelectedNeurodataTypes,
}) => {
  const handleDelete = (chipToDelete: string) => {
    setSelectedNeurodataTypes(
      selectedNeurodataTypes.filter((chip) => chip !== chipToDelete)
    );
  };

  const handleAddition = (chipToAdd: string) => {
    setSelectedNeurodataTypes([...selectedNeurodataTypes, chipToAdd]);
  };

  return (
    <div>
      <Autocomplete
        multiple
        id="neurodata-types-selector"
        options={allNeurodataTypes}
        freeSolo
        value={selectedNeurodataTypes}
        onChange={(event, newValue) => {
          setSelectedNeurodataTypes(newValue);
        }}
        renderTags={(value: string[], getTagProps) =>
          value.map((option: string, index: number) => (
            <Chip
              variant="outlined"
              label={option}
              {...getTagProps({ index })}
            />
          ))
        }
        renderInput={(params) => (
          <TextField {...params} variant="outlined" label="Neurodata Types" />
        )}
      />
    </div>
  );
};

export default NeurodataTypesSelector;