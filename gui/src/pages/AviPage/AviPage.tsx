import { FunctionComponent, useEffect, useState } from "react"
import { getEtage } from "../NwbPage/NwbPage"

type Props = {
    width: number
    height: number
    url: string
}

const AviPage: FunctionComponent<Props> = ({width, height, url}) => {
    const [mp4Url, setMp4Url] = useState<string | undefined | null>(undefined)

    useEffect(() => {
        let canceled = false
        ;(async () => {
            const etag = await getEtage(url)
            if (!etag) {
                setMp4Url(null)
                return
            }
            if (canceled) return
            const x = `https://neurosift.org/computed/avi/ETag/${etag.slice(0, 2)}/${etag.slice(2, 4)}/${etag.slice(4, 6)}/${etag}/converted.mp4`
            setMp4Url(x)
        })()
        return () => {canceled = true}
    }, [url])

    if (mp4Url === null) {
        return (
            <div>Unable to find file: {url}</div>
        )
    }
    if (!mp4Url) return (
        <div>Loading...</div>
    )
    return (
        <video
            src={mp4Url}
            controls
            style={{width, height}}
        />
    )
}

export default AviPage