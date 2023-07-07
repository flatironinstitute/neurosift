import { FunctionComponent, useEffect, useReducer, useState } from "react"
import { NwbFileContext } from "./NwbFileContext"
import { SetupNwbOpenTabs } from "./NwbOpenTabsContext"
import NwbTabWidget from "./NwbTabWidget"
import { getRemoteH5File, RemoteH5File } from "./RemoteH5File/RemoteH5File"
import { SelectedNwbItemsContext, selectedNwbItemsReducer } from "./SelectedNwbItemsContext"

type Props = {
    width: number
    height: number
    url?: string
}

// const url = 'https://api.dandiarchive.org/api/assets/29ba1aaf-9091-469a-b331-6b8ab818b5a6/download/'

const defaultId = 'c86cdfba-e1af-45a7-8dfd-d243adc20ced'
const defaultUrl = `https://dandiarchive.s3.amazonaws.com/blobs/${defaultId.slice(0, 3)}/${defaultId.slice(3, 6)}/${defaultId}`

const TestPage: FunctionComponent<Props> = ({width, height, url}) => {
    const [nwbFile, setNwbFile] = useState<RemoteH5File | undefined>(undefined)
    const [selectedNwbItemsState, selectedNwbItemsDispatch] = useReducer(selectedNwbItemsReducer, {selectedNwbItems: []})

    useEffect(() => {
        let canceled = false
        const load = async () => {
            const metaUrl = await getMetaUrl(url || defaultUrl)
            const f = await getRemoteH5File(url || defaultUrl, metaUrl)
            if (canceled) return
            setNwbFile(f)
        }
        load()
        return () => {canceled = true}
    }, [url])
    if (!nwbFile) return <div>Loading {url}</div>
    return (
        <NwbFileContext.Provider value={nwbFile}>
            <SelectedNwbItemsContext.Provider value={{selectedNwbItemsState, selectedNwbItemsDispatch}}>
                <SetupNwbOpenTabs>
                    <NwbTabWidget
                        width={width}
                        height={height}
                    />
                </SetupNwbOpenTabs>
            </SelectedNwbItemsContext.Provider>
        </NwbFileContext.Provider>
    )
}

const getMetaUrl = async (url: string) => {
    const aa = 'https://dandiarchive.s3.amazonaws.com/'
    if (!url.startsWith(aa)) {
        return undefined
    }
    const pp = url.slice(aa.length)
    const candidateMetaUrl = `https://neurosift.org/nwb-meta/dandiarchive/${pp}`
    try {
        const resp = await fetch(candidateMetaUrl, {method: 'HEAD'})
        if (resp.status === 200) return candidateMetaUrl
        // status of 404 means it wasn't found
    }
    catch(err: any) {
        console.warn(`Unable to HEAD ${candidateMetaUrl}: ${err.message}`)
    }
    return undefined
}

export default TestPage