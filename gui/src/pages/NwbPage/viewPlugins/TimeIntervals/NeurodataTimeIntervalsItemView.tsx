import { FunctionComponent, useContext } from "react"
import { NwbFileContext } from "../../NwbFileContext"
import { useGroup } from "../../NwbMainView/NwbMainView"
import NwbTimeIntervalsView from "./NwbTimeIntervalsView"

type Props = {
    width: number
    height: number
    path: string
    condensed?: boolean
}

const NeurodataTimeIntervalsItemView: FunctionComponent<Props> = ({width, height, path}) => {
    const nwbFile = useContext(NwbFileContext)
    if (!nwbFile) throw Error('Unexpected: nwbFile is undefined (no context provider)')
    const group = useGroup(nwbFile, path)
    if (!group) return <div>Loading...</div>

    return (
        <NwbTimeIntervalsView
            width={width}
            height={height}
            nwbFile={nwbFile}
            group={group}
        />
    )
}

export default NeurodataTimeIntervalsItemView