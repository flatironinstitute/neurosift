import { FunctionComponent } from "react"
import Splitter from "../../../../../components/Splitter"
import NwbTimeseriesView from "../../../TimeseriesItemView/NwbTimeseriesView"
import SpatialSeriesSpatialView from "./SpatialSeriesSpatialView"

type Props = {
    width: number
    height: number
    path: string
    condensed?: boolean
}

const NeurodataSpatialSeriesItemView: FunctionComponent<Props> = ({width, height, path, condensed}) => {
    const timeseriesContent = (
        <NwbTimeseriesView
            width={width}
            height={height}
            objectPath={path}
        />
    )

    if (condensed) return timeseriesContent

    return (
        <Splitter
            width={width}
            height={height}
            direction="vertical"
            initialPosition={height / 2}
        >
            {timeseriesContent}
            <SpatialSeriesSpatialView
                width={width}
                height={height}
                objectPath={path}
            />
        </Splitter>
    )
}

export default NeurodataSpatialSeriesItemView