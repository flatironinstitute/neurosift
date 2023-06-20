import { FunctionComponent, useEffect, useState } from "react";
import deserializeReturnValue from "../../../../deserializeReturnValue";
import { useRtcshare } from "../../../../rtcshare/useRtcshare";
import RasterPlotView3 from "../RasterPlotView3/RasterPlotView3";

type Props = {
    width: number
    height: number
    sessionPath: string
    objectName: string
}

type SpikeTrainsData = {
    type: 'SpikeTrains'
    startTimeSec: number,
    endTimeSec: number,
    units: {
        unitId: number | string
        spikeTimesSec: number[]
    }[]
}

class SpikeTrainsClientFromSpikeTrainsData {
    constructor(private spikeTrainsData: SpikeTrainsData) {
    }
    async initialize() {
    }
    get startTimeSec() {
        return this.spikeTrainsData.startTimeSec
    }
    get endTimeSec() {
        return this.spikeTrainsData.endTimeSec
    }
    get unitIds() {
        return this.spikeTrainsData.units.map(u => u.unitId)
    }
    async getData(startTimeSec: number, endTimeSec: number) {
        return this.spikeTrainsData.units.map(u => ({
            unitId: u.unitId,
            spikeTimesSec: u.spikeTimesSec.filter(t => (t >= startTimeSec) && (t < endTimeSec))
        }))
    }
}

const TsGroupView: FunctionComponent<Props> = ({width, height, sessionPath, objectName}) => {
    const {client: rtcshareClient} = useRtcshare()
    const [spikeTrainsData, setSpikeTrainsData] = useState<SpikeTrainsData>()
    useEffect(() => {
        let canceled = false
        if (!rtcshareClient) return
        (async () => {
            const {result, binaryPayload} = await rtcshareClient.serviceQuery('pynapple', {
                type: 'get_tsgroup',
                session_uri: `rtcshare://${sessionPath}`,
                object_name: objectName
            })
            if (canceled) return
            if (!result.success) throw new Error(result.error)
            // parse binaryPayload (which is an ArrayBuffer) to json object
            const x: SpikeTrainsData = await deserializeReturnValue(JSON.parse(new TextDecoder().decode(binaryPayload)))
            setSpikeTrainsData(x)
        })()
        return () => {canceled = true}
    }, [rtcshareClient, sessionPath, objectName])

    if (!spikeTrainsData) return (
        <div>Loading...</div>
    )

    return (
        <RasterPlotView3
            spikeTrainsClient={new SpikeTrainsClientFromSpikeTrainsData(spikeTrainsData)}
            width={width}
            height={height}
        />
    )
}

export default TsGroupView