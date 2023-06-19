import { FunctionComponent, useEffect, useState } from "react";
import deserializeReturnValue from "../../../deserializeReturnValue";
import { isTimeseriesGraphViewData, TimeseriesGraphView, TimeseriesGraphViewData } from "../../../package/view-timeseries-graph";
import { useRtcshare } from "../../../rtcshare/useRtcshare";
import { isTimeseriesAnnotationFileData } from "../../../TimeseriesAnnotation/TimeseriesAnnotationFileData";

type Props = {
    width: number
    height: number
    filePath: string
    annotationFilePath?: string
}

const TimeseriesGraphFileView: FunctionComponent<Props> = ({width, height, filePath, annotationFilePath}) => {
    const [text, setText] = useState<string | undefined>(undefined)
    const [annotationText, setAnnotationText] = useState<string | undefined>(undefined)

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

    useEffect(() => {
        let canceled = false
        if (!client) return
        if (!annotationFilePath) return
        ; (async () => {
            const buf = await client.readFile(annotationFilePath)
            if (canceled) return
            // array buffer to text
            const decoder = new TextDecoder('utf-8')
            const txt = decoder.decode(buf)
            setAnnotationText(txt)
        })()
        return () => {canceled = true}
    }, [client, annotationFilePath])

    const [viewData, setViewData] = useState<TimeseriesGraphViewData | undefined>(undefined)

    useEffect(() => {
        let canceled = false
        if (!text) return
        if ((annotationFilePath) && (!annotationText)) return
        ; (async () => {
            const d = await deserializeReturnValue(JSON.parse(text))
            if (canceled) return
            if (!isTimeseriesGraphViewData(d)) {
                console.warn(d)
                console.warn('Invalid timeseries graph view data')
                return
            }
            if ((annotationFilePath) && (annotationText)) {
                const dAnnotation = await deserializeReturnValue(JSON.parse(annotationText))
                if (canceled) return
                if (!isTimeseriesAnnotationFileData(dAnnotation)) {
                    console.warn(dAnnotation)
                    console.warn('Invalid timeseries annotation file data')
                    return
                }
                d.annotation = dAnnotation
            }
            setViewData(d)
        })()
        return () => {canceled = true}
    }, [text, annotationText, annotationFilePath])

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