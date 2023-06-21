import { FunctionComponent, useEffect, useState } from "react";
import deserializeReturnValue from "../../../deserializeReturnValue";
import { AutocorrelogramsView, AutocorrelogramsViewData, isAutocorrelogramsViewData } from "../../../package/view-autocorrelograms";
import { useRtcshare } from "../../../rtcshare/useRtcshare";

type Props = {
    width: number
    height: number
    filePath: string
}

const AutocorrelogramsFileView: FunctionComponent<Props> = ({width, height, filePath}) => {
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

    const [viewData, setViewData] = useState<AutocorrelogramsViewData | undefined>(undefined)

    useEffect(() => {
        let canceled = false
        if (!text) return
        ; (async () => {
            const d = await deserializeReturnValue(JSON.parse(text))
            if (canceled) return
            if (!isAutocorrelogramsViewData(d)) {
                console.warn(d)
                console.warn('Invalid autocorrelograms view data')
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
        <AutocorrelogramsView
            data={viewData}
            width={width}
            height={height}
        />
    )
}

export default AutocorrelogramsFileView