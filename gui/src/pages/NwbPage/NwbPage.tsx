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

const NwbPage: FunctionComponent<Props> = ({width, height, url}) => {
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

const headRequest = async (url: string) => {
    // Cannot use HEAD, because it is not allowed by CORS on DANDI AWS bucket
    // let headResponse
    // try {
    //     headResponse = await fetch(url, {method: 'HEAD'})
    //     if (headResponse.status !== 200) {
    //         return undefined
    //     }
    // }
    // catch(err: any) {
    //     console.warn(`Unable to HEAD ${url}: ${err.message}`)
    //     return undefined
    // }
    // return headResponse

    // Instead, use aborted GET.
    const controller = new AbortController();
    const signal = controller.signal;
    const response = await fetch(url, { signal })
    controller.abort();
    return response
}

const getMetaUrl = async (url: string) => {
    const headResponse = await headRequest(url)
    if (!headResponse) return undefined
    
    let etag = headResponse.headers.get('ETag')
    if (!etag) {
        return undefined
    }
    // remove quotes
    etag = etag.slice(1, etag.length - 1)
    const computedAssetBaseUrl = `https://neurosift.org/computed/nwb/ETag/${etag.slice(0, 2)}/${etag.slice(2, 4)}/${etag.slice(4, 6)}/${etag}`
    const metaNwbUrl = `${computedAssetBaseUrl}/meta.1.nwb`
    let headResponse2
    try {
        headResponse2 = await fetch(metaNwbUrl, {method: 'HEAD'})
        if (headResponse2.status === 200) {
            return metaNwbUrl
        }
    }
    catch(err: any) {
        console.warn(`Unable to HEAD ${metaNwbUrl}: ${err.message}`)
    }
    return undefined

    // const aa = 'https://dandiarchive.s3.amazonaws.com/'
    // if (!url.startsWith(aa)) {
    //     return undefined
    // }
    // const pp = url.slice(aa.length)
    // const candidateMetaUrl = `https://neurosift.org/nwb-meta/dandiarchive/${pp}`
    // try {
    //     const resp = await fetch(candidateMetaUrl, {method: 'HEAD'})
    //     if (resp.status === 200) return candidateMetaUrl
    //     // status of 404 means it wasn't found
    // }
    // catch(err: any) {
    //     console.warn(`Unable to HEAD ${candidateMetaUrl}: ${err.message}`)
    // }
    // return undefined
}

export default NwbPage