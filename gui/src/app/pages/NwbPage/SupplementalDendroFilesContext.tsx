import { createContext, useContext } from "react";
import { DendroFile } from "../../dendro/dendro-types";

type SupplementalDendroFilesType = {
  supplementalFiles?: DendroFile[];
  selectedSupplementalFileIds: string[];
  setSelectedSupplementalFileIds: (
    selectedSupplementalFileIds: string[],
  ) => void;
};

const defaultSupplementalDendroFiles: SupplementalDendroFilesType = {
  selectedSupplementalFileIds: [],
  setSelectedSupplementalFileIds: () => {},
};

export const SupplementalDendroFilesContext =
  createContext<SupplementalDendroFilesType>(defaultSupplementalDendroFiles);

export const useSupplementalDendroFiles = () => {
  const a = useContext(SupplementalDendroFilesContext);
  return {
    supplementalFiles: a.supplementalFiles,
    selectedSupplementalFileIds: a.selectedSupplementalFileIds,
    setSelectedSupplementalFileIds: a.setSelectedSupplementalFileIds,
  };
};
