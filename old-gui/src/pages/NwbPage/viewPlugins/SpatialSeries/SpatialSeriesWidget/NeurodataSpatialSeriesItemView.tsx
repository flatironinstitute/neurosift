import { FunctionComponent } from "react"
import Splitter from "../../../../../components/Splitter"
import NwbTimeseriesView from "../../../viewPlugins/TimeSeries/TimeseriesItemView/NwbTimeseriesView"
import SpatialSeriesXYView from "./SpatialSeriesXYView"

type Props = {
    width: number
    height: number
    path: string
    condensed?: boolean
}

const NeurodataSpatialSeriesItemView: FunctionComponent<Props> = ({width, height, path, condensed}) => {
    // in the future, do something specific to the spatial series, like providing an X/Y legend
    return (
        <NwbTimeseriesView
            width={width}
            height={height}
            objectPath={path}
        />
    )
}

export default NeurodataSpatialSeriesItemView