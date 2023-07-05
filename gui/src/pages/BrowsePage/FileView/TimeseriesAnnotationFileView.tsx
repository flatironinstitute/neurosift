import { FunctionComponent, useEffect, useState } from "react";
import { useRtcshare } from "../../../rtcshare/useRtcshare";
import { isTimeseriesAnnotationFileData, TimeseriesAnnotationFileData } from "../../../TimeseriesAnnotation/TimeseriesAnnotationFileData";
import TimeseriesAnnotationWidget from "../../../TimeseriesAnnotation/TimeseriesAnnotationWidget";

type Props = {
    width: number
    height: number
    filePath: string
}

const TimeseriesAnnotationFileView: FunctionComponent<Props> = ({width, height, filePath}) => {
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

    const [viewData, setViewData] = useState<TimeseriesAnnotationFileData | undefined>(undefined)

    useEffect(() => {
        let canceled = false
        if (!text) return
        ; (async () => {
            const d = JSON.parse(text)
            if (canceled) return
            if (!isTimeseriesAnnotationFileData(d)) {
                console.warn(d)
                console.warn('Invalid timeseries annotation file data')
                return
            }
            setViewData(d)
        })()
        return () => {canceled = true}
    }, [text])

    if (!viewData) {
        return (
            <div style={{position: 'absolute', width, height, background: 'white'}}>
                Loading...
            </div>
        )
    }

    return (
        <TimeseriesAnnotationWidget
            data={viewData}
            width={width}
            height={height}
        />
    )
}

export default TimeseriesAnnotationFileView