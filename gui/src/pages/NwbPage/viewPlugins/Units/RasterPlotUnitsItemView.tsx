import { FunctionComponent, useCallback, useContext, useEffect, useState } from "react"
import Hyperlink from "../../../../components/Hyperlink"
import { useRtcshare } from "../../../../rtcshare/useRtcshare"
import NeurosiftItemView from "../../NeurosiftItemView/NeurosiftItemView"
import { NwbFileContext } from "../../NwbFileContext"
import { getEtag, headRequest } from "../../NwbPage"
import { MergedRemoteH5File } from "@fi-sci/remote-h5-file"

type Props = {
    width: number
    height: number
    path: string
    condensed?: boolean
}

const useRasterPlotUrl = () => {
    const nwbFile = useContext(NwbFileContext)
    if (!nwbFile) throw Error('Unexpected: nwbFile is null')

    let nwbFileUrl: string
    if (nwbFile instanceof MergedRemoteH5File) {
        nwbFileUrl = nwbFile.getFiles()[0].url
    }
    else {
        nwbFileUrl = nwbFile.url
    }

    const [url, setUrl] = useState<string | null | undefined>(undefined)
    useEffect(() => {
        let canceled = false
        const load = async () => {
            const etag = await getEtag(nwbFileUrl)
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
    }, [nwbFileUrl])
    return url
}

const RasterPlotUnitsItemView: FunctionComponent<Props> = ({width, height, path, condensed}) => {
    const nwbFile = useContext(NwbFileContext)
    if (!nwbFile) throw Error('Unexpected: nwbFile is null')
    const rasterPlotUrl = useRasterPlotUrl()
    const [rasterPlotRequested, setRasterPlotRequested] = useState(false)
    const {client: rtcshareClient} = useRtcshare()

    const handleRequestRasterPlot = useCallback(() => {
        (async () => {
            if (!rtcshareClient) return
            console.log('WARNING: this feature no longer supported')
            // await rtcshareClient.serviceQuery('neurosift-nwb-request', {
            //     type: 'request-raster-plot',
            //     nwbUrl: nwbFile.url,
            //     path: '/units'
            // })
            // setRasterPlotRequested(true)
        })()
    }, [])

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

    return (
        <NeurosiftItemView
            width={width}
            height={height}
            url={rasterPlotUrl}
        />
    )
}

const checkFileExists = async (url: string) => {
    const resp = await headRequest(url)
    if (!resp) return false
    return (resp.status === 200)
}

export default RasterPlotUnitsItemView