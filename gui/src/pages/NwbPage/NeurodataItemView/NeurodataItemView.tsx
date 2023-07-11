import { FunctionComponent } from "react"
import ImageSegmentationItemView from "../ImageSegmentationItemView/ImageSegmentationItemView"
import { neurodataTypeInheritsFrom } from "../neurodataSpec"
import TwoPhotonSeriesItemView from "../TwoPhotonSeries/TwoPhotonSeriesItemView"
import NeurodataSpatialSeriesItemView from "./NeurodataSpatialSeriesItemView"
import NeurodataTimeIntervalsItemView from "./NeurodataTimeIntervalsItemView"
import NeurodataTimeSeriesItemView from "./NeurodataTimeSeriesItemView"

type Props = {
    width: number
    height: number
    path: string
    neurodataType: string
    condensed?: boolean
}

const NeurodataItemView: FunctionComponent<Props> = ({width, height, path, neurodataType, condensed}) => {
    // start with most specific types
    if (neurodataTypeInheritsFrom(neurodataType, 'ImageSegmentation')) {
        return <ImageSegmentationItemView width={width} height={height} path={path} condensed={condensed} />
    }
    else if (neurodataTypeInheritsFrom(neurodataType, 'SpatialSeries')) {
        return <NeurodataSpatialSeriesItemView width={width} height={height} path={path} condensed={condensed} />
    }
    else if (neurodataTypeInheritsFrom(neurodataType, 'TwoPhotonSeries')) {
        return <TwoPhotonSeriesItemView width={width} height={height} path={path} condensed={condensed} />
    }
    else if (neurodataTypeInheritsFrom(neurodataType, 'TimeSeries')) {
        return <NeurodataTimeSeriesItemView width={width} height={height} path={path} condensed={condensed} />
    }
    else if (neurodataTypeInheritsFrom(neurodataType, 'TimeIntervals')) {
        return <NeurodataTimeIntervalsItemView width={width} height={height} path={path} condensed={condensed} />
    }
    else {
        return <div>Unsupported neurodata type: {neurodataType}</div>
    }
}

export default NeurodataItemView