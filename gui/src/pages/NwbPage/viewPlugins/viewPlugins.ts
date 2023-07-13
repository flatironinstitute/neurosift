import { FunctionComponent } from "react"
import ImageSegmentationItemView from "./ImageSegmentation/ImageSegmentationItemView"
import NeurodataElectricalSeriesItemView from "./ElectricalSeries/NeurodataElectricalSeriesItemView"
import NeurodataSpatialSeriesItemView from "./SpatialSeries/NeurodataSpatialSeriesItemView"
import NeurodataTimeIntervalsItemView from "./TimeIntervals/NeurodataTimeIntervalsItemView"
import NeurodataTimeSeriesItemView from "./TimeSeries/NeurodataTimeSeriesItemView"
import { neurodataTypeInheritanceRaw } from "../neurodataSpec"
import TwoPhotonSeriesItemView from "./TwoPhotonSeries/TwoPhotonSeriesItemView"

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

// ElectricalSeries
viewPlugins.push({
    neurodataType: 'ElectricalSeries',
    component: NeurodataElectricalSeriesItemView
})

///////////////////////////////////////////////////////////////////////////////////////

export const findViewPluginForType = (neurodataType: string) => {
    let nt: string | undefined = neurodataType
    while (nt) {
        const plugin = viewPlugins.find(p => (p.neurodataType === nt))
        if (plugin) return plugin
        nt = neurodataTypeInheritanceRaw[nt]
    }
    return undefined
}

export default viewPlugins