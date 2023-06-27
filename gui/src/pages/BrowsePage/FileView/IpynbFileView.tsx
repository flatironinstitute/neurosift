import { FunctionComponent, useCallback, useEffect, useMemo, useState } from "react";
import { useRtcshare } from "../../../rtcshare/useRtcshare";
import IpynbView from "./SpikeSortingDigestView/IpynbView/IpynbView";

type Props = {
    width: number
    height: number
    filePath: string
}

const IpynbFileView: FunctionComponent<Props> = ({width, height, filePath}) => {
    const [text, setText] = useState<string | undefined>(undefined)
    const [refreshCode, setRefreshCode] = useState<number>(0)
    const refreshText = useCallback(() => {
        setRefreshCode(c => c + 1)
    }, [])

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
    }, [client, filePath, refreshCode])

    const source = useMemo(() => {
        if (!text) return undefined
        return JSON.parse(text)
    }, [text])

    if (!source) {
        return <div>...</div>
    }

    return (
        <IpynbView
            width={width}
            height={height}
            source={source}
        />
    )
}

export default IpynbFileView