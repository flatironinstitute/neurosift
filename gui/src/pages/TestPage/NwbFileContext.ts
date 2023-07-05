import { createContext } from "react";
import { RemoteH5File } from "./RemoteH5File/RemoteH5File";

type NwbFileContextType = RemoteH5File | null

export const NwbFileContext = createContext<NwbFileContextType>(null)