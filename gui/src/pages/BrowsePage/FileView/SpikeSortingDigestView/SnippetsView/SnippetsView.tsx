import { FunctionComponent, useEffect, useState } from "react"
import { WaveformOpts } from "../../../../../package/view-average-waveforms/WaveformWidget/WaveformWidget"
import { useRtcshare } from "../../../../../rtcshare/useRtcshare"
import ZarrArrayClient from "../../../../zarr/ZarrArrayClient"
import SnippetsClient from "./SnippetsClient"
import SnippetsPlot, { UnitInfo } from "./SnippetsPlot"

type Props = {
    width: number
    height: number
    ssdPath: string
    unitId: string | number
    samplingFrequency: number
    singleRow?: boolean
}

const waveformOpts: WaveformOpts = {
    waveformWidth: 1,
    showChannelIds: false,
    useUnitColors: false
}

const SnippetsView: FunctionComponent<Props> = ({width, height, ssdPath, unitId, samplingFrequency, singleRow}) => {
    const [snippetsClient, setSnippetsClient] = useState<SnippetsClient>()

    const {client: rtcshareClient} = useRtcshare()

    const [unitInfo, setUnitInfo] = useState<UnitInfo>()
    useEffect(() => {
        if (!rtcshareClient) return
        let canceled = false
        setUnitInfo(undefined)
        ;(async () => {
            const p = `${ssdPath}/units/${unitId}/unit_info.json`
            const buf = await rtcshareClient.readFile(p)
            // decode array buffer
            const txt = new TextDecoder().decode(buf)
            if (canceled) return
            const unitInfo = JSON.parse(txt)
            setUnitInfo(unitInfo)
        })()
        return () => { canceled = true }
    }, [ssdPath, rtcshareClient, unitId])

    const [averageWaveformData, setAverageWaveformData] = useState<number[][]>()
    useEffect(() => {
        if (!rtcshareClient) return
        let canceled = false
        setAverageWaveformData(undefined)
        ;(async () => {
            const zarrUri = `rtcshare://${ssdPath}/units/${unitId}/data.zarr`
            const c1 = new ZarrArrayClient(zarrUri, 'average_waveform_in_neighborhood', rtcshareClient)
            const x = await c1.getArray2D()
            if (canceled) return
            setAverageWaveformData(x)
        })()
        return () => {canceled = true}
    }, [ssdPath, rtcshareClient, unitId])

    const [spikeTimesData, setSpikeTimesData] = useState<number[]>()
    useEffect(() => {
        if (!rtcshareClient) return
        let canceled = false
        setSpikeTimesData(undefined)
        ;(async () => {
            const zarrUri = `rtcshare://${ssdPath}/units/${unitId}/data.zarr`
            const c1 = new ZarrArrayClient(zarrUri, 'subsampled_spike_times', rtcshareClient)
            const x = await c1.getArray1D()
            if (canceled) return
            setSpikeTimesData(x.map(t => (t / samplingFrequency)))
        })()
        return () => {canceled = true}
    }, [ssdPath, rtcshareClient, unitId, samplingFrequency])

    useEffect(() => {
        if (!rtcshareClient) return
        let canceled = false
        setSnippetsClient(undefined)
        ;(async () => {
            const zarrUri = `rtcshare://${ssdPath}/units/${unitId}/data.zarr`
            const c1 = new ZarrArrayClient(zarrUri, 'subsampled_snippets_in_neighborhood', rtcshareClient)
            await c1.shape()
            const client = new SnippetsClient(c1)
            if (canceled) return
            setSnippetsClient(client)
        })()
        return () => {canceled = true}
    }, [ssdPath, rtcshareClient, unitId])

    
    if (!snippetsClient) return <div>Loading snippets...</div>
    if (!unitInfo) return <div>Loading unit info...</div>
    return (
        <SnippetsPlot
            snippetsClient={snippetsClient}
            averageWaveform={averageWaveformData}
            spikeTimes={spikeTimesData}
            unitId={unitId}
            unitInfo={unitInfo}
            width={width}
            height={height}
            waveformOpts={waveformOpts}
            singleRow={singleRow}
        />
    )
}

export default SnippetsView