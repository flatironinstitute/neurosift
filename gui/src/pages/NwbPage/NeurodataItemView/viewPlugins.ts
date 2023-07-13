import { FunctionComponent } from "react"
import ImageSegmentationItemView from "../ImageSegmentationItemView/ImageSegmentationItemView"
import TwoPhotonSeriesItemView from "../TwoPhotonSeries/TwoPhotonSeriesItemView"
import NeurodataSpatialSeriesItemView from "./NeurodataSpatialSeriesItemView"
import NeurodataTimeIntervalsItemView from "./NeurodataTimeIntervalsItemView"
import NeurodataTimeSeriesItemView from "./NeurodataTimeSeriesItemView"

type Props = {
    width: number,
    height: number,
    path: string
    condensed?: boolean
}

const viewPlugins: {
    neurodataType: string,
    component: FunctionComponent<Props>
}[] = []

///////////////////////////////////////////////////////////////////////////////////////
// REGISTER VIEW PLUGINS HERE

// ImageSegmentation
viewPlugins.push({
    neurodataType: 'ImageSegmentation',
    component: ImageSegmentationItemView
})

// SpatialSeries
viewPlugins.push({
    neurodataType: 'SpatialSeries',
    component: NeurodataSpatialSeriesItemView
})

// TwoPhotonSeries
viewPlugins.push({
    neurodataType: 'TwoPhotonSeries',
    component: TwoPhotonSeriesItemView
})

// TimeSeries
viewPlugins.push({
    neurodataType: 'TimeSeries',
    component: NeurodataTimeSeriesItemView
})

// TimeIntervals
viewPlugins.push({
    neurodataType: 'TimeIntervals',
    component: NeurodataTimeIntervalsItemView
})

///////////////////////////////////////////////////////////////////////////////////////

export default viewPlugins