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
import ImagesItemView from "./Images/ImagesItemView"
import RasterPlotUnitsItemView from "./Units/RasterPlotUnitsItemView"
import AutocorrelogramsUnitsItemView from "./Units/AutocorrelogramsUnitsItemView"

type Props = {
    width: number,
    height: number,
    path: string
    condensed?: boolean
}

export type ViewPlugin = {
    name: string
    neurodataType: string,
    defaultForNeurodataType?: boolean,
    component: FunctionComponent<Props>
    buttonLabel?: string
}

const viewPlugins: ViewPlugin[] = []

///////////////////////////////////////////////////////////////////////////////////////
// REGISTER VIEW PLUGINS HERE

// ImageSegmentation
viewPlugins.push({
    name: 'ImageSegmentation',
    neurodataType: 'ImageSegmentation',
    defaultForNeurodataType: true,
    component: ImageSegmentationItemView
})

// SpatialSeries
viewPlugins.push({
    name: 'SpatialSeries',
    neurodataType: 'SpatialSeries',
    defaultForNeurodataType: true,
    component: NeurodataSpatialSeriesItemView
})

// TwoPhotonSeries
viewPlugins.push({
    name: 'TwoPhotonSeries',
    neurodataType: 'TwoPhotonSeries',
    defaultForNeurodataType: true,
    component: TwoPhotonSeriesItemView
})

// TimeSeries
viewPlugins.push({
    name: 'TimeSeries',
    neurodataType: 'TimeSeries',
    defaultForNeurodataType: true,
    component: NeurodataTimeSeriesItemView
})

// DynamicTable
viewPlugins.push({
    name: 'DynamicTable',
    neurodataType: 'DynamicTable',
    defaultForNeurodataType: true,
    component: DynamicTableView
})

// TimeIntervals
viewPlugins.push({
    name: 'TimeIntervals',
    neurodataType: 'TimeIntervals',
    defaultForNeurodataType: true,
    component: NeurodataTimeIntervalsItemView
})

// ElectricalSeries
viewPlugins.push({
    name: 'ElectricalSeries',
    neurodataType: 'ElectricalSeries',
    defaultForNeurodataType: true,
    component: NeurodataElectricalSeriesItemView
})

// HelloWorld
viewPlugins.push({
    name: 'HelloWorld',
    neurodataType: 'LabeledEvents', // hi-jacking this type for now
    defaultForNeurodataType: true,
    component: HelloWorldView // see ./HelloWorld/HelloWorldView.tsx
})
// See https://flatironinstitute.github.io/neurosift/#/nwb?url=https://dandiarchive.s3.amazonaws.com/blobs/8cf/38e/8cf38e36-6cd8-4c10-9d74-c2e6be70f019
// for an example that has a LabeledEvents object inside processing/behavior

// ImageSeries
viewPlugins.push({
    name: 'ImageSeries',
    neurodataType: 'ImageSeries',
    defaultForNeurodataType: true,
    component: ImageSeriesItemView
})

// Units
viewPlugins.push({
    name: 'RasterPlot',
    neurodataType: 'Units',
    defaultForNeurodataType: false,
    buttonLabel: 'raster plot',
    component: RasterPlotUnitsItemView
})
viewPlugins.push({
    name: 'Autocorrelograms',
    neurodataType: 'Units',
    defaultForNeurodataType: false,
    buttonLabel: 'autocorrelograms',
    component: AutocorrelogramsUnitsItemView
})

// Images
viewPlugins.push({
    name: 'Images',
    neurodataType: 'Images',
    defaultForNeurodataType: true,
    component: ImagesItemView
})

///////////////////////////////////////////////////////////////////////////////////////

export const findViewPluginsForType = (neurodataType: string): {viewPlugins: ViewPlugin[], defaultViewPlugin: ViewPlugin | undefined} => {
    const viewPluginsRet: ViewPlugin[] = []
    let defaultViewPlugin: ViewPlugin | undefined
    let nt: string | undefined = neurodataType
    while (nt) {
        const plugins = viewPlugins.filter(p => (p.neurodataType === nt))
        viewPluginsRet.push(...plugins)
        plugins.forEach(p => {
            if (p.defaultForNeurodataType) {
                if (!defaultViewPlugin) defaultViewPlugin = p
            }
        })
        nt = neurodataTypeInheritanceRaw[nt]
    }
    return {viewPlugins: viewPluginsRet, defaultViewPlugin}
}

export default viewPlugins