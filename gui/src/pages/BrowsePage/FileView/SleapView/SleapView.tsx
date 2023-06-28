import { FunctionComponent, useEffect, useState } from "react"
import { useRtcshare } from "../../../../rtcshare/useRtcshare"


type Props = {
    width: number
    height: number
    filePath: string
}

type SlpSkeleton = {
    name: string
    node_names: string[]
    edge_inds: number[][]
    symmetries: string[][]
}

const useSlpSkeletons = (filePath: string) => {
    const [skeletons, setSkeletons] = useState<SlpSkeleton[]>([])
    const {client: rtcshareClient} = useRtcshare()

    useEffect(() => {
        if (!rtcshareClient) return
        let canceled = false
        const loadSkeletons = async () => {
            const {result} = await rtcshareClient.serviceQuery('sleap', {
                type: 'get_skeletons',
                slp_file_uri: `rtcshare://${filePath}`
            })
            if (canceled) return
            setSkeletons(result.skeletons as SlpSkeleton[])
        }
        loadSkeletons()
        return () => {canceled = true}
    }, [filePath, rtcshareClient])

    return skeletons
}

const SleapView: FunctionComponent<Props> = ({width, height, filePath}) => {
    const skeletons = useSlpSkeletons(filePath)
    if (!skeletons.length) return <div>Loading...</div>
    return (
        <div style={{position: 'absolute', width, height, overflowY: 'auto'}}>
            <p>
                This is a preliminary view of a SLEAP file.
                As a proof of concept, we load the skeletons.
            </p>
            <h3>Skeletons:</h3>
            {JSON.stringify(skeletons, null, 4)}
        </div>
    )
}

export default SleapView