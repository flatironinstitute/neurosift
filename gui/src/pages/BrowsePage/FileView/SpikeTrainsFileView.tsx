import { FunctionComponent, useEffect, useState } from "react";
import { useTimeRange } from "../../../package/context-timeseries-selection";
import { useRtcshare } from "../../../rtcshare/useRtcshare";
import validateObject, { isArrayOf, isEqualTo, isNumber, isOneOf, isString } from "../../../types/validateObject";
import RasterPlotView3 from "./RasterPlotView3/RasterPlotView3";
import SpikeTrainsClient, { SpikeTrainsClientType } from "./RasterPlotView3/SpikeTrainsClient";
import SpikeTrainsClientFromRemoteNwb from "./RasterPlotView3/SpikeTrainsClientFromRemoteNwb";

type Props = {
    width: number
    height: number
    filePath: string
}

export type SpikeTrainsFileData = {
    type: 'SpikeTrains'
    startTimeSec: number
    endTimeSec: number
    spikeTrains: {
        unitId: number | string
        spikeTimesSec: number[]
    }[]
}

export const isSpikeTrainsFileData = (x: any): x is SpikeTrainsFileData => {
    return validateObject(x, {
        type: isEqualTo('SpikeTrains'),
        startTimeSec: isNumber,
        endTimeSec: isNumber,
        spikeTrains: isArrayOf(y => (validateObject(y, {
            unitId: isOneOf([isNumber, isString]),
            spikeTimesSec: () => (true)
        })))
    })
}

const SpikeTrainsFileView: FunctionComponent<Props> = ({width, height, filePath}) => {
    const {client} = useRtcshare()
    const [spikeTrainsClient, setSpikeTrainsClient] = useState<SpikeTrainsClientType>()

    useEffect(() => {
        let canceled = false
        if (!client) return
        ; (async () => {
            let stc: SpikeTrainsClientType
            if (filePath.startsWith('remote-nwb|')) {
                const url = filePath.slice('remote-nwb|'.length)
                stc = new SpikeTrainsClientFromRemoteNwb(url)
            }
            else {
                stc = new SpikeTrainsClient(filePath, client)
            }
            await stc.initialize()
            if (canceled) return
            setSpikeTrainsClient(stc)
        })()
        return () => {canceled = true}
    }, [client, filePath])

    // initialize the visible time range
    const startTimeSec = spikeTrainsClient?.startTimeSec
    const endTimeSec = spikeTrainsClient?.endTimeSec
    const { setVisibleTimeRange } = useTimeRange()
    useEffect(() => {
        if (startTimeSec === undefined) return
        if (endTimeSec === undefined) return
        setVisibleTimeRange(startTimeSec, Math.min(startTimeSec + 60 * 3, endTimeSec))
    }, [startTimeSec, endTimeSec, setVisibleTimeRange])

    if (!spikeTrainsClient) return <div>Loading...</div>

    return (
        <RasterPlotView3
            spikeTrainsClient={spikeTrainsClient}
            width={width}
            height={height}
        />
    )
}

export default SpikeTrainsFileView