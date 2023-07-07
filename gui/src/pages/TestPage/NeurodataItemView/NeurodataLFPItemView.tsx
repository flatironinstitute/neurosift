import { FunctionComponent, useContext } from "react"
import Splitter from "../../../components/Splitter"
import AcquisitionItemTimeseriesView from "../NwbAcquisitionItemView/AcquisitionItemTimeseriesView"
import { NwbFileContext } from "../NwbFileContext"
import { useGroup } from "../NwbMainView/NwbMainView"
import NeurodataItemViewLeftPanel from "./NeurodataItemViewLeftPanel"

type Props = {
    width: number
    height: number
    path: string
    condenced?: boolean
}

const NeurodataLFPItemView: FunctionComponent<Props> = ({width, height, path, condenced}) => {
    const nwbFile = useContext(NwbFileContext)
    if (!nwbFile) throw Error('Unexpected: nwbFile is undefined (no context provider)')
    const group = useGroup(nwbFile, path)

    const content = (
        <AcquisitionItemTimeseriesView
            width={width}
            height={height}
            objectPath={path + '/LFP'}
        />
    )

    if (condenced) return content

    return (
        <Splitter
            direction="horizontal"
            initialPosition={300}
            width={width}
            height={height}
        >
            <NeurodataItemViewLeftPanel
                width={0}
                height={0}
                path={path}
                group={group}
            />
            {content}
        </Splitter>
    )
}

export default NeurodataLFPItemView