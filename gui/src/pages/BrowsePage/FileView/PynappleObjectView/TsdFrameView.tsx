import { FunctionComponent, useEffect, useState } from "react";
import deserializeReturnValue from "../../../../deserializeReturnValue";
import { colorForUnitId } from "../../../../package/spike_sorting/unit-colors";
import { TimeseriesGraphView, TimeseriesGraphViewData } from "../../../../package/view-timeseries-graph";
import { useRtcshare } from "../../../../rtcshare/useRtcshare";

type Props = {
    width: number
    height: number
    sessionPath: string
    objectName: string
}

type TsdFrameData = {
    type: 'TsdFrame'
    times: number[]
    columns: {
        name: string
        values: number[]
    }[]
}

const TsdFrameView: FunctionComponent<Props> = ({width, height, sessionPath, objectName}) => {
    const {client: rtcshareClient} = useRtcshare()
    const [tsdFrameData, setTsdFrameData] = useState<TsdFrameData>()
    useEffect(() => {
        let canceled = false
        if (!rtcshareClient) return
        (async () => {
            const {result, binaryPayload} = await rtcshareClient.serviceQuery('pynapple', {
                type: 'get_tsdframe',
                session_uri: `rtcshare://${sessionPath}`,
                object_name: objectName
            })
            if (canceled) return
            if (!result.success) throw new Error(result.error)
            // parse binaryPayload (which is an ArrayBuffer) to json object
            const x: TsdFrameData = await deserializeReturnValue(JSON.parse(new TextDecoder().decode(binaryPayload)))
            setTsdFrameData(x)
        })()
        return () => {canceled = true}
    }, [rtcshareClient, sessionPath, objectName])

    const [viewData, setViewData] = useState<TimeseriesGraphViewData>()
    useEffect(() => {
        if (!tsdFrameData) return
        const viewData: TimeseriesGraphViewData = {
            type: 'TimeseriesGraph',
            datasets: tsdFrameData.columns.map(col => ({
                name: `column-${col.name}`,
                data: {
                    't': tsdFrameData.times,
                    'y': col.values
                }
            })),
            series: tsdFrameData.columns.map((col, i) => ({
                type: 'line',
                dataset: `column-${col.name}`,
                title: col.name,
                encoding: {
                    t: 't',
                    y: 'y'
                },
                attributes: {
                    color: colorForUnitId(i)
                }
            }))
        }
        setViewData(viewData)
    }, [tsdFrameData])

    if (!viewData) {
        return (
            <div>Loading...</div>
        )
    }

    return (
        <TimeseriesGraphView
            width={width}
            height={height}
            data={viewData}
        />
    )
}

export default TsdFrameView