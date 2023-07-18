import { FunctionComponent } from "react"
import ImageSegmentationItemView from "./ImageSegmentation/ImageSegmentationItemView"
import NeurodataElectricalSeriesItemView from "./ElectricalSeries/NeurodataElectricalSeriesItemView"
import NeurodataSpatialSeriesItemView from "./SpatialSeries/SpatialSeriesWidget/NeurodataSpatialSeriesItemView"
import NeurodataTimeIntervalsItemView from "./TimeIntervals/NeurodataTimeIntervalsItemView"
import NeurodataTimeSeriesItemView from "./TimeSeries/NeurodataTimeSeriesItemView"
import { neurodataTypeInheritanceRaw } from "../neurodataSpec"
import TwoPhotonSeriesItemView from "./TwoPhotonSeries/TwoPhotonSeriesItemView"
import HelloWorldView from "./HelloWorld/HelloWorldView"
import ImageSeriesItemView from "./ImageSeries/ImageSeriesItemView"
import DynamicTableView from "./DynamicTable/DynamicTableView"

type Props = {
    width: number,
    height: number,
    path: string
    condensed?: boolean
}

const viewPlugins: {
    name: string
    neurodataType: string,
    component: FunctionComponent<Props>
}[] = []

///////////////////////////////////////////////////////////////////////////////////////
// REGISTER VIEW PLUGINS HERE

// ImageSegmentation
viewPlugins.push({
    name: 'ImageSegmentation',
    neurodataType: 'ImageSegmentation',
    component: ImageSegmentationItemView
})

// SpatialSeries
viewPlugins.push({
    name: 'SpatialSeries',
    neurodataType: 'SpatialSeries',
    component: NeurodataSpatialSeriesItemView
})

// TwoPhotonSeries
viewPlugins.push({
    name: 'TwoPhotonSeries',
    neurodataType: 'TwoPhotonSeries',
    component: TwoPhotonSeriesItemView
})

// TimeSeries
viewPlugins.push({
    name: 'TimeSeries',
    neurodataType: 'TimeSeries',
    component: NeurodataTimeSeriesItemView
})

// DynamicTable
viewPlugins.push({
    name: 'DynamicTable',
    neurodataType: 'DynamicTable',
    component: DynamicTableView
})

// TimeIntervals
viewPlugins.push({
    name: 'TimeIntervals',
    neurodataType: 'TimeIntervals',
    component: NeurodataTimeIntervalsItemView
})

// ElectricalSeries
viewPlugins.push({
    name: 'ElectricalSeries',
    neurodataType: 'ElectricalSeries',
    component: NeurodataElectricalSeriesItemView
})

// HelloWorld
viewPlugins.push({
    name: 'HelloWorld',
    neurodataType: 'LabeledEvents', // hi-jacking this type for now
    component: HelloWorldView // see ./HelloWorld/HelloWorldView.tsx
})
// See https://flatironinstitute.github.io/neurosift/#/nwb?url=https://dandiarchive.s3.amazonaws.com/blobs/8cf/38e/8cf38e36-6cd8-4c10-9d74-c2e6be70f019
// for an example that has a LabeledEvents object inside processing/behavior

// ImageSeries
viewPlugins.push({
    name: 'ImageSeries',
    neurodataType: 'ImageSeries',
    component: ImageSeriesItemView
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