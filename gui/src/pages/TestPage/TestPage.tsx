import { FunctionComponent, useEffect, useState } from "react"
import nwb from 'webnwb' 
import NwbView from "./NwbView"

type Props = {
    width: number
    height: number
}

const url = 'https://api.dandiarchive.org/api/assets/29ba1aaf-9091-469a-b331-6b8ab818b5a6/download/'

const TestPage: FunctionComponent<Props> = ({width, height}) => {
    const [nwbFile, setNwbFile] = useState<any>(undefined)
    useEffect(() => {
        const load = async () => {
            const io = new nwb.NWBHDF5IO()
            const file = await io.load(url, { useStreaming: true })
            ; (window as any)._file = file
            setNwbFile(file)
        }
        load()
    }, [])
    if (!nwbFile) return <div>Loading {url}</div>
    return (
        <NwbView
            width={width}
            height={height}
            nwbFile={nwbFile}
        />
    )
}

export default TestPage