import { FunctionComponent, useEffect, useState } from "react";
import { useRtcshare } from "../../../rtcshare/useRtcshare";
import NSFigView from "./NSFigView/NSFigView";
import { isNSFigViewData, NSFigViewData } from "./NSFigView/NSFigViewData";
import yaml from 'js-yaml'

type Props = {
    width: number
    height: number
    filePath: string
}

const NSFigFileView: FunctionComponent<Props> = ({width, height, filePath}) => {
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

    const [viewData, setViewData] = useState<NSFigViewData | undefined>(undefined)

    useEffect(() => {
        if (!text) return
        // parse yaml text
        const d = yaml.load(text)
        if (!isNSFigViewData(d)) {
            console.warn(d)
            console.warn('Invalid nsfig view data')
            return
        }
        setViewData(d)
    }, [text])

    if (!viewData) {
        return <div>...</div>
    }

    return (
        <NSFigView
            path={directoryOfFile(filePath)}
            data={viewData}
            width={width}
            height={height}
        />
    )
}

export const directoryOfFile = (filePath: string) => {
    const ind = filePath.lastIndexOf('/')
    if (ind >= 0) return filePath.slice(0, ind)
    return ''
}

export default NSFigFileView