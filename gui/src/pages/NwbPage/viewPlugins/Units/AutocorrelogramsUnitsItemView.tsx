import { FunctionComponent, useCallback, useContext, useEffect, useState } from "react"
import Hyperlink from "../../../../components/Hyperlink"
import { useRtcshare } from "../../../../rtcshare/useRtcshare"
import NeurosiftItemView from "../../NeurosiftItemView/NeurosiftItemView"
import { NwbFileContext } from "../../NwbFileContext"
import { getEtag, headRequest } from "../../NwbPage"

type Props = {
    width: number
    height: number
    path: string
    condensed?: boolean
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

const AutocorrelogramsUnitsItemView: FunctionComponent<Props> = ({width, height, path, condensed}) => {
    const nwbFile = useContext(NwbFileContext)
    if (!nwbFile) throw Error('Unexpected: nwbFile is null')
    const autocorrelogramsUrl = useAutocorrelogramsUrl()
    const [autocorrelogramsRequested, setAutocorrelogramsRequested] = useState(false)
    const {client: rtcshareClient} = useRtcshare()

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

    return (
        <NeurosiftItemView
            width={width}
            height={height}
            url={autocorrelogramsUrl}
        />
    )
}

const checkFileExists = async (url: string) => {
    const resp = await headRequest(url)
    if (!resp) return false
    return (resp.status === 200)
}

export default AutocorrelogramsUnitsItemView