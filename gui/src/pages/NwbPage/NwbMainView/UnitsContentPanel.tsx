import { FunctionComponent, useCallback, useContext, useEffect, useState } from "react"
import Hyperlink from "../../../components/Hyperlink"
import { useRtcshare } from "../../../rtcshare/useRtcshare"
import { NwbFileContext } from "../NwbFileContext"
import { useNwbOpenTabs } from "../NwbOpenTabsContext"
import { getEtag, headRequest } from "../NwbPage"
import { RemoteH5File, RemoteH5Group } from "../RemoteH5File/RemoteH5File"
import { useSelectedNwbItems } from "../SelectedNwbItemsContext"
import DynamicTableView from "../viewPlugins/DynamicTable/DynamicTableView"

type Props = {
    nwbFile: RemoteH5File
    group: RemoteH5Group
    width: number
}

const UnitsContentPanel: FunctionComponent<Props> = ({nwbFile, group, width}) => {
    return (
        <div>
            <div>&nbsp;</div>
            <RequestableRasterPlot />
            <div>&nbsp;</div>
            <RequestableAutocorrelograms />
            <div>&nbsp;</div>
            <DynamicTableView
                width={width}
                height={300}
                path={group.path}
            />
        </div>
    )
}

const useRasterPlotUrl = () => {
    const nwbFile = useContext(NwbFileContext)
    if (!nwbFile) throw Error('Unexpected: nwbFile is null')
    const [url, setUrl] = useState<string | null | undefined>(undefined)
    useEffect(() => {
        let canceled = false
        const load = async () => {
            const etag = await getEtag(nwbFile.url)
            if (canceled) return
            if (!etag) {
                setUrl(null)
                return
            }
            const candidateUrl = `https://neurosift.org/computed/nwb/ETag/${etag.slice(0, 2)}/${etag.slice(2, 4)}/${etag.slice(4, 6)}/${etag}/units/raster_plot.1.ns-spt`
            const exists = await checkFileExists(candidateUrl)
            if (canceled) return
            setUrl(
                exists ? candidateUrl : null
            )
        }
        load()
        return () => {canceled = true}
    }, [nwbFile])
    return url
}

const RequestableRasterPlot: FunctionComponent = () => {
    const nwbFile = useContext(NwbFileContext)
    if (!nwbFile) throw Error('Unexpected: nwbFile is null')
    const rasterPlotUrl = useRasterPlotUrl()
    const [rasterPlotRequested, setRasterPlotRequested] = useState(false)
    const {client: rtcshareClient} = useRtcshare()
    const {selectedNwbItemPaths, toggleSelectedNwbItem} = useSelectedNwbItems()

    const {openTab} = useNwbOpenTabs()

    const handleRequestRasterPlot = useCallback(() => {
        (async () => {
            if (!rtcshareClient) return
            await rtcshareClient.serviceQuery('neurosift-nwb-request', {
                type: 'request-raster-plot',
                nwbUrl: nwbFile.url,
                path: '/units'
            })
            setRasterPlotRequested(true)
        })()
    }, [nwbFile, rtcshareClient])

    if (rasterPlotUrl === undefined) {
        return (
            <div>Probing for raster plot...</div>
        )
    }

    if (rasterPlotUrl === null) {
        if (rasterPlotRequested) {
            return <div>Raster plot requested</div>
        }
        return (
            <div>
                <Hyperlink
                    onClick={handleRequestRasterPlot}
                >Request raster plot</Hyperlink>
            </div>
        )
    }

    const checked = selectedNwbItemPaths.includes(rasterPlotUrl)

    return (
        <div>
            <input type="checkbox" checked={checked} onChange={() => {}} onClick={() => {
                toggleSelectedNwbItem(rasterPlotUrl)
            }} />&nbsp;
            <Hyperlink
                onClick={() => {
                    openTab(`ns:${rasterPlotUrl}`)
                }}
            >raster plot</Hyperlink>
        </div>
    )
}

const useAutocorrelogramsUrl = () => {
    const nwbFile = useContext(NwbFileContext)
    if (!nwbFile) throw Error('Unexpected: nwbFile is null')
    const [url, setUrl] = useState<string | null | undefined>(undefined)
    useEffect(() => {
        let canceled = false
        const load = async () => {
            const etag = await getEtag(nwbFile.url)
            if (canceled) return
            if (!etag) {
                setUrl(null)
                return
            }
            const candidateUrl = `https://neurosift.org/computed/nwb/ETag/${etag.slice(0, 2)}/${etag.slice(2, 4)}/${etag.slice(4, 6)}/${etag}/units/autocorrelograms.1.ns-acg`
            const exists = await checkFileExists(candidateUrl)
            if (canceled) return
            setUrl(
                exists ? candidateUrl : null
            )
        }
        load()
        return () => {canceled = true}
    }, [nwbFile])
    return url
}

const RequestableAutocorrelograms: FunctionComponent = () => {
    const nwbFile = useContext(NwbFileContext)
    if (!nwbFile) throw Error('Unexpected: nwbFile is null')
    const autocorrelogramsUrl = useAutocorrelogramsUrl()
    const [autocorrelogramsRequested, setAutocorrelogramsRequested] = useState(false)
    const {client: rtcshareClient} = useRtcshare()
    const {selectedNwbItemPaths, toggleSelectedNwbItem} = useSelectedNwbItems()

    const {openTab} = useNwbOpenTabs()

    const handleRequestAutocorrelograms = useCallback(() => {
        (async () => {
            if (!rtcshareClient) return
            await rtcshareClient.serviceQuery('neurosift-nwb-request', {
                type: 'request-autocorrelograms',
                nwbUrl: nwbFile.url,
                path: '/units'
            })
            setAutocorrelogramsRequested(true)
        })()
    }, [nwbFile, rtcshareClient])

    if (autocorrelogramsUrl === undefined) {
        return (
            <div>Probing for autocorrelograms...</div>
        )
    }

    if (autocorrelogramsUrl === null) {
        if (autocorrelogramsRequested) {
            return <div>Autocorrelograms requested</div>
        }
        return (
            <div>
                <Hyperlink
                    onClick={handleRequestAutocorrelograms}
                >Request autocorrelograms</Hyperlink>
            </div>
        )
    }

    const checked = selectedNwbItemPaths.includes(autocorrelogramsUrl)

    return (
        <div>
            <input type="checkbox" checked={checked} onChange={() => {}} onClick={() => {
                toggleSelectedNwbItem(autocorrelogramsUrl)
            }} />&nbsp;
            <Hyperlink
                onClick={() => {
                    openTab(`ns:${autocorrelogramsUrl}`)
                }}
            >autocorrelograms</Hyperlink>
        </div>
    )
}



const checkFileExists = async (url: string) => {
    const resp = await headRequest(url)
    if (!resp) return false
    return (resp.status === 200)
}

export default UnitsContentPanel