import { FunctionComponent, useCallback, useEffect, useState } from "react";
import { useRtcshare } from "../../../rtcshare/useRtcshare";
import TextEditor from "./TextEditor/TextEditor";

type Props = {
    width: number
    height: number
    filePath: string
}

const ScriptFileView: FunctionComponent<Props> = ({width, height, filePath}) => {
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

    return (
        <TextEditor
            text={text}
            onSaveText={() => {}}
            editedText={text}
            onSetEditedText={() => {}}
            language={languageForFileName(filePath)}
            readOnly={true}
            wordWrap={wordWrapForFileName(filePath)}
            onReload={refreshText}
            label={filePath}
            width={width}
            height={height}
        />
    )
}

const languageForFileName = (fileName: string) => {
    if (fileName.endsWith('.py')) return 'python'
    return 'text'
}

const wordWrapForFileName = (fileName: string) => {
    if (fileName.endsWith('.py')) return false
    return true
}

export default ScriptFileView