import { FunctionComponent, useEffect, useState } from "react";
import { useRtcshare } from "../../../rtcshare/useRtcshare";
import validateObject, { isArrayOf, isEqualTo, isNumber, isOneOf, isString } from "../../../types/validateObject";
import RasterPlotView3 from "./RasterPlotView3/RasterPlotView3";
import SpikeTrainsClient from "./RasterPlotView3/SpikeTrainsClient";

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
    const [spikeTrainsClient, setSpikeTrainsClient] = useState<SpikeTrainsClient>()

    useEffect(() => {
        let canceled = false
        if (!client) return
        ; (async () => {
            const stc = new SpikeTrainsClient(filePath, client)
            await stc.initialize()
            if (canceled) return
            setSpikeTrainsClient(stc)
        })()
        return () => {canceled = true}
    }, [client, filePath])

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