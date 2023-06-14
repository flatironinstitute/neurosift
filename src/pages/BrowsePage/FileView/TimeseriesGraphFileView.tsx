import { FunctionComponent, useEffect, useState } from "react";
import deserializeReturnValue from "../../../deserializeReturnValue";
import { isTimeseriesGraphViewData, TimeseriesGraphView, TimeseriesGraphViewData } from "../../../package/view-timeseries-graph";
import { useRtcshare } from "../../../rtcshare/useRtcshare";

type Props = {
    width: number
    height: number
    filePath: string
}

const TimeseriesGraphFileView: FunctionComponent<Props> = ({width, height, filePath}) => {
    const [text, setText] = useState<string | undefined>(undefined)

    const {client} = useRtcshare()

    useEffect(() => {
        let canceled = false
        if (!client) return
        ; (async () => {
            const buf = await client.readFile(filePath)
            if (canceled) return
            // array buffer to text
            const decoder = new TextDecoder('utf-8')
            const txt = decoder.decode(buf)
            setText(txt)
        })()
        return () => {canceled = true}
    }, [client, filePath])

    const [viewData, setViewData] = useState<TimeseriesGraphViewData | undefined>(undefined)

    useEffect(() => {
        let canceled = false
        if (!text) return
        ; (async () => {
            const d = await deserializeReturnValue(JSON.parse(text))
            if (canceled) return
            if (!isTimeseriesGraphViewData(d)) {
                console.warn(d)
                console.warn('Invalid timeseries graph view data')
                return
            }
            setViewData(d)
        })()
        return () => {canceled = true}
    }, [text])

    if (!viewData) {
        return <div>...</div>
    }

    return (
        <TimeseriesGraphView
            data={viewData}
            width={width}
            height={height}
        />
    )
}

export default TimeseriesGraphFileView