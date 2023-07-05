import { FunctionComponent, useEffect, useState } from "react";
import { useTimeRange } from "../../../package/context-timeseries-selection";
import { useRtcshare } from "../../../rtcshare/useRtcshare";
import RasterPlotView3 from "./RasterPlotView3/RasterPlotView3";
import SpikeTrainsClient, { SpikeTrainsClientType } from "./RasterPlotView3/SpikeTrainsClient";
import SpikeTrainsClientFromRemoteNwb from "./RasterPlotView3/SpikeTrainsClientFromRemoteNwb";
import TimeseriesGraph2Client from "./TimeseriesGraph2View/TimeseriesGraph2Client";
import TimeseriesGraph2View from "./TimeseriesGraph2View/TimeseriesGraph2View";

type Props = {
    width: number
    height: number
    filePath: string
}

const TimeseriesGraph2FileView: FunctionComponent<Props> = ({width, height, filePath}) => {
    const {client} = useRtcshare()
    const [timeseriesGraph2Client, setTimeseriesGraph2Client] = useState<TimeseriesGraph2Client>()

    useEffect(() => {
        let canceled = false
        if (!client) return
        ; (async () => {
            const cc = new TimeseriesGraph2Client(filePath, client)
            await cc.initialize()
            if (canceled) return
            setTimeseriesGraph2Client(cc)
        })()
        return () => {canceled = true}
    }, [client, filePath])

    // initialize the visible time range
    const startTimeSec = timeseriesGraph2Client?.startTimeSec
    const endTimeSec = timeseriesGraph2Client?.endTimeSec
    const { setVisibleTimeRange } = useTimeRange()
    useEffect(() => {
        if (startTimeSec === undefined) return
        if (endTimeSec === undefined) return
        setVisibleTimeRange(startTimeSec, Math.min(startTimeSec + 60 * 3, endTimeSec))
    }, [startTimeSec, endTimeSec, setVisibleTimeRange])

    if (!timeseriesGraph2Client) return <div>Loading...</div>

    return (
        <TimeseriesGraph2View
            client={timeseriesGraph2Client}
            width={width}
            height={height}
        />
    )
}

export default TimeseriesGraph2FileView