import { FunctionComponent, useEffect, useReducer, useState } from "react"
import { useRtcshare } from "../../rtcshare/useRtcshare"
import useRoute from "../../useRoute"
import { NwbFileContext } from "./NwbFileContext"
import { SetupNwbOpenTabs } from "./NwbOpenTabsContext"
import NwbTabWidget from "./NwbTabWidget"
import { getRemoteH5File, RemoteH5File } from "./RemoteH5File/RemoteH5File"
import { SelectedNwbItemsContext, selectedNwbItemsReducer } from "./SelectedNwbItemsContext"
import { fetchJson } from "./viewPlugins/ImageSeries/ImageSeriesItemView"

type Props = {
    width: number
    height: number
}

// const url = 'https://api.dandiarchive.org/api/assets/29ba1aaf-9091-469a-b331-6b8ab818b5a6/download/'

const defaultId = 'c86cdfba-e1af-45a7-8dfd-d243adc20ced'
const defaultUrl = `https://dandiarchive.s3.amazonaws.com/blobs/${defaultId.slice(0, 3)}/${defaultId.slice(3, 6)}/${defaultId}`

const NwbPage: FunctionComponent<Props> = ({width, height}) => {
    const {route, setRoute} = useRoute()

    useEffect(() => {
        let canceled = false
        ; (async () => {
            if ((route.page === 'nwb') && (!route.url) && (route.dandiAssetUrl)) {
                const info = await fetchJson(route.dandiAssetUrl)
                if (canceled) return
                const blobUrl = info['contentUrl'].find((x: any) => (x.startsWith('https://dandiarchive.s3.amazonaws.com/blobs')))
                setRoute({
                    ...route,
                    url: blobUrl
                })
            }
        })()
        return () => {canceled = true}
    }, [route.page, route, setRoute])

    if ((route.page === 'nwb') && (!route.url)) {
        if (route.dandiAssetUrl) {
            return <div style={{paddingLeft: 20}}>Obtaining asset blob URL from {route.dandiAssetUrl}</div>
        }
        return <div style={{paddingLeft: 20}}>No url query parameter</div>
    }
    return (
        <NwbPageChild
            width={width}
            height={height}
        />
    )
}

const NwbPageChild: FunctionComponent<Props> = ({width, height}) => {
    const {route} = useRoute()
    const url = route.page === 'nwb' ? route.url : route.page === 'test' ? defaultUrl : undefined
    const [nwbFile, setNwbFile] = useState<RemoteH5File | undefined>(undefined)
    const [selectedNwbItemsState, selectedNwbItemsDispatch] = useReducer(selectedNwbItemsReducer, {selectedNwbItems: []})
    const {client: rtcshareClient} = useRtcshare()

    useEffect(() => {
        let canceled = false
        const load = async () => {
            const metaUrl = await getMetaUrl(url || defaultUrl)
            if (canceled) return
            if ((!metaUrl) && (url) && (rtcshareClient)) {
                console.info(`Requesting meta for ${url}`)
                rtcshareClient.serviceQuery('neurosift-nwb-request', {
                    type: 'request-meta-nwb',
                    nwbUrl: url
                })
            }
            const f = await getRemoteH5File(url || defaultUrl, metaUrl)
            if (canceled) return
            setNwbFile(f)
        }
        load()
        return () => {canceled = true}
    }, [url, rtcshareClient])
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

export const headRequest = async (url: string) => {
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

const etagCache: {[key: string]: string | undefined} = {}

export const getEtag = async (url: string) => {
    if (etagCache[url]) return etagCache[url]
    const headResponse = await headRequest(url)
    if (!headResponse) return undefined
    const etag = headResponse.headers.get('ETag')
    if (!etag) {
        return undefined
    }
    // remove quotes
    const ret = etag.slice(1, etag.length - 1)
    etagCache[url] = ret
    return ret
}

const getMetaUrl = async (url: string) => {
    const etag = await getEtag(url)
    if (!etag) return undefined
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