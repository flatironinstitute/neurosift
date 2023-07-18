import { FunctionComponent, useContext } from "react"
import { NwbFileContext } from "../../NwbFileContext"
import NwbTimeseriesView from "./TimeseriesItemView/NwbTimeseriesView"

type Props = {
    width: number
    height: number
    path: string
    condensed?: boolean
}

const NeurodataTimeSeriesItemView: FunctionComponent<Props> = ({width, height, path}) => {
    const nwbFile = useContext(NwbFileContext)
    if (!nwbFile) throw Error('Unexpected: nwbFile is undefined (no context provider)')

    return (
        <NwbTimeseriesView
            width={width}
            height={height}
            objectPath={path}
        />
    )
}

export default NeurodataTimeSeriesItemView