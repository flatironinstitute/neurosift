import { FunctionComponent, useContext, useEffect, useState } from "react"
import Splitter from "../../../components/Splitter"
import { NwbFileContext } from "../NwbFileContext"
import { MergedRemoteH5File, RemoteH5Dataset, RemoteH5File, RemoteH5Group } from "@fi-sci/remote-h5-file"
import NwbMainLeftPanel from "./NwbMainLeftPanel"
import NwbMainViewMainPanel from "./NwbMainViewMainPanel"

type Props = {
    width: number
    height: number
}

const NwbMainView: FunctionComponent<Props> = ({width, height}) => {
    const nwbFile = useContext(NwbFileContext)
    if (!nwbFile) throw Error('Unexpected: nwbFile is undefined (no context provider)')
    return (
        <Splitter
            direction="horizontal"
            initialPosition={Math.min(500, width / 3)}
            width={width}
            height={height}
        >
            <NwbMainLeftPanel
                width={0}
                height={0}
                nwbFile={nwbFile}
            />
            <NwbMainViewMainPanel
                width={0}
                height={0}
                nwbFile={nwbFile}
            />
        </Splitter>
    )
}

export const useGroup = (nwbFile: RemoteH5File | MergedRemoteH5File, path: string): RemoteH5Group | undefined => {
    const [group, setGroup] = useState<RemoteH5Group | undefined>(undefined)
    useEffect(() => {
        let canceled = false
        const load = async () => {
            const grp = await nwbFile.getGroup(path)
            if (canceled) return
            setGroup(grp)
        }
        load()
        return () => {canceled = true}
    }, [nwbFile, path])
    return group
}

export const useDataset = (nwbFile: RemoteH5File | MergedRemoteH5File, path: string) => {
    const [dataset, setDataset] = useState<RemoteH5Dataset | undefined>(undefined)
    useEffect(() => {
        let canceled = false
        const load = async () => {
            const ds = await nwbFile.getDataset(path)
            if (canceled) return
            setDataset(ds)
        }
        load()
        return () => {canceled = true}
    }, [nwbFile, path])
    return dataset
}

export const useDatasetData = (nwbFile: RemoteH5File | MergedRemoteH5File, path: string | undefined) => {
    const [data, setData] = useState<any | undefined>(undefined)
    const [dataset, setDataset] = useState<RemoteH5Dataset | undefined>(undefined)
    useEffect(() => {
        if (!path) return
        let canceled = false
        const load = async () => {
            const ds = await nwbFile.getDataset(path)
            if (canceled) return
            setDataset(ds)
            const d = await nwbFile.getDatasetData(path, {})
            if (canceled) return
            setData(d)
        }
        load()
        return () => {canceled = true}
    }, [nwbFile, path])
    return {dataset, data}
}

export default NwbMainView