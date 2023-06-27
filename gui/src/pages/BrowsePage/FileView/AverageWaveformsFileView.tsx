import { FunctionComponent, useEffect, useState } from "react";
import deserializeReturnValue from "../../../deserializeReturnValue";
import { AverageWaveformsView, AverageWaveformsViewData, isAverageWaveformsViewData } from "../../../package/view-average-waveforms";
import { useRtcshare } from "../../../rtcshare/useRtcshare";

type Props = {
    width: number
    height: number
    filePath: string
}

export const useAverageWaveformsViewData = (filePath: string) => {
    const {client} = useRtcshare()
    const [text, setText] = useState<string | undefined>(undefined)
    const [viewData, setViewData] = useState<AverageWaveformsViewData | undefined>(undefined)

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
        if (!text) return
        ; (async () => {
            const d = await deserializeReturnValue(JSON.parse(text))
            if (canceled) return
            if (!isAverageWaveformsViewData(d)) {
                console.warn(d)
                console.warn('Invalid average waveforms view data')
                return
            }
            setViewData(d)
        })()
        return () => {canceled = true}
    }, [text])

    return viewData
}

const AverageWaveformsFileView: FunctionComponent<Props> = ({width, height, filePath}) => {
    const viewData = useAverageWaveformsViewData(filePath)

    if (!viewData) {
        return <div>...</div>
    }

    return (
        <AverageWaveformsView
            data={viewData}
            width={width}
            height={height}
        />
    )
}

export default AverageWaveformsFileView