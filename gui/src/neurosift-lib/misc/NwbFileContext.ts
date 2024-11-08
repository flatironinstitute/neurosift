import { createContext, useContext } from "react";
import { RemoteH5FileX } from "../remote-h5-file/index";

type NwbFileContextType = {
  nwbFile: RemoteH5FileX | null;
  neurodataItems: {
    path: string;
    neurodataType: string;
  }[];
};

const defaultNwbFileContext: NwbFileContextType = {
  nwbFile: null,
  neurodataItems: [],
};

export const NwbFileContext = createContext<NwbFileContextType>(
  defaultNwbFileContext,
);

export const useNwbFile = () => {
  const a = useContext(NwbFileContext);
  if (!a.nwbFile) throw Error("No NwbFile");
  return a.nwbFile;
};

export const useNwbFileSafe = () => {
  const a = useContext(NwbFileContext);
  return a.nwbFile;
};

export const useNeurodataItems = () => {
  const a = useContext(NwbFileContext);
  if (!a.nwbFile) throw Error("No NwbFileContext");
  return a.neurodataItems;
};
