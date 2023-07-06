import { FunctionComponent, useEffect, useState } from "react"
import { NwbFileContext } from "./NwbFileContext"
import { SetupNwbOpenTabs } from "./NwbOpenTabsContext"
import NwbTabWidget from "./NwbTabWidget"
import { getRemoteH5File, RemoteH5File } from "./RemoteH5File/RemoteH5File"

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

    useEffect(() => {
        let canceled = false
        const load = async () => {
            const f = await getRemoteH5File(url || defaultUrl)
            if (canceled) return
            setNwbFile(f)
        }
        load()
        return () => {canceled = true}
    }, [])
    if (!nwbFile) return <div>Loading {url}</div>
    return (
        <NwbFileContext.Provider value={nwbFile}>
            <SetupNwbOpenTabs>
                <NwbTabWidget
                    width={width}
                    height={height}
                />
            </SetupNwbOpenTabs>
        </NwbFileContext.Provider>
    )
}

export default TestPage