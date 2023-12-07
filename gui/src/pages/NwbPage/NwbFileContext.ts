import { createContext, useContext } from "react";
import { MergedRemoteH5File, RemoteH5File } from "./RemoteH5File/RemoteH5File";

type NwbFileContextType = RemoteH5File | MergedRemoteH5File | null

export const NwbFileContext = createContext<NwbFileContextType>(null)

export const useNwbFile = () => {
    const nwbFile = useContext(NwbFileContext)
    if (!nwbFile) throw Error('No NwbFile')
    return nwbFile
}