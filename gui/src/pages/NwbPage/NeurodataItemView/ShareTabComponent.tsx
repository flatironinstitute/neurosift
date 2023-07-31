import { FunctionComponent, useCallback, useRef, useState } from "react"
import Hyperlink from "../../../components/Hyperlink"

type Props = {
    tabName?: string
}

const ShareTabComponent: FunctionComponent<Props> = ({tabName}) => {
    const [generatedUrl, setGeneratedUrl] = useState<string | null>(null)
    
    const handleClick = useCallback(() => {
        const url = window.location.href + `&tab=${tabName}`
        setGeneratedUrl(url)
    }, [tabName])
    
    if (!tabName) return <div />
    
    if (generatedUrl) {
        return (
            <CopyableText text={generatedUrl} />
        )
    }

    return (
        <div>
            <Hyperlink onClick={handleClick}>Share this tab</Hyperlink>
        </div>
    )
}

const CopyableText: FunctionComponent<{text: string}> = ({text}) => {
    const inputRef = useRef<HTMLInputElement>(null)
    const handleCopy = useCallback(() => {
        navigator.clipboard.writeText(text)
    }, [text])
    return (
        <div>
            <input
                ref={inputRef}
                type="text"
                value={text}
                readOnly={true}
                onClick={() => {inputRef.current?.select()}}
            />
            <button onClick={handleCopy}>Copy</button>
        </div>
    )
}

export default ShareTabComponent