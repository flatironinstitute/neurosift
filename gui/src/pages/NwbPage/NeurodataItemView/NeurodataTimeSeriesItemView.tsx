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
    condensed?: boolean
}

const NeurodataTimeSeriesItemView: FunctionComponent<Props> = ({width, height, path, condensed}) => {
    const nwbFile = useContext(NwbFileContext)
    if (!nwbFile) throw Error('Unexpected: nwbFile is undefined (no context provider)')
    const group = useGroup(nwbFile, path)

    const content = (
        <AcquisitionItemTimeseriesView
            width={width}
            height={height}
            objectPath={path}
        />
    )

    if (condensed) return content

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
                viewName="TimeSeries"
            />
            {content}  
        </Splitter>
    )
}

export default NeurodataTimeSeriesItemView