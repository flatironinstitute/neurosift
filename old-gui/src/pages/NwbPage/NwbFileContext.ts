import { createContext, useContext } from "react";
import { RemoteH5FileX } from "@fi-sci/remote-h5-file";

type NwbFileContextType = RemoteH5FileX | null

export const NwbFileContext = createContext<NwbFileContextType>(null)

export const useNwbFile = () => {
    const nwbFile = useContext(NwbFileContext)
    if (!nwbFile) throw Error('No NwbFile')
    return nwbFile
}