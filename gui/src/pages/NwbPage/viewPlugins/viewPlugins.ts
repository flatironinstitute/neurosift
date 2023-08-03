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
import DirectRasterPlotUnitsItemView from "./Units/DirectRasterPlotUnitsItemView"
import SpatialSeriesXYView from "./SpatialSeries/SpatialSeriesWidget/SpatialSeriesXYView"
import { RemoteH5File } from "../RemoteH5File/RemoteH5File"
import PSTHItemView from "./PSTH/PSTHItemView"
import LabeledEventsItemView from "./LabeledEvents/LabeledEventsItemView"
import BehavioralEventsItemView from "./BehavioralEvents/BehavioralEventsItemView"

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
    remoteDataOnly?: boolean
    checkEnabled?: (nwbFile: RemoteH5File, path: string) => Promise<boolean>
    isTimeView?: boolean
}

const viewPlugins: ViewPlugin[] = []

///////////////////////////////////////////////////////////////////////////////////////
// REGISTER VIEW PLUGINS HERE

// ImageSegmentation
viewPlugins.push({
    name: 'ImageSegmentation',
    neurodataType: 'ImageSegmentation',
    defaultForNeurodataType: true,
    component: ImageSegmentationItemView,
    isTimeView: false
})

// SpatialSeries
viewPlugins.push({
    name: 'SpatialSeries',
    neurodataType: 'SpatialSeries',
    defaultForNeurodataType: true,
    component: NeurodataSpatialSeriesItemView,
    isTimeView: true
})
viewPlugins.push({
    name: 'X/Y',
    neurodataType: 'SpatialSeries',
    defaultForNeurodataType: false,
    component: SpatialSeriesXYView,
    buttonLabel: 'X/Y',
    isTimeView: true
})

// TwoPhotonSeries
viewPlugins.push({
    name: 'TwoPhotonSeries',
    neurodataType: 'TwoPhotonSeries',
    defaultForNeurodataType: true,
    component: TwoPhotonSeriesItemView,
    isTimeView: true
})

// TimeSeries
viewPlugins.push({
    name: 'TimeSeries',
    neurodataType: 'TimeSeries',
    defaultForNeurodataType: true,
    component: NeurodataTimeSeriesItemView,
    isTimeView: true
})

// DynamicTable
viewPlugins.push({
    name: 'DynamicTable',
    neurodataType: 'DynamicTable',
    defaultForNeurodataType: true,
    component: DynamicTableView,
    isTimeView: false
})

// TimeIntervals
viewPlugins.push({
    name: 'TimeIntervals',
    neurodataType: 'TimeIntervals',
    defaultForNeurodataType: true,
    component: NeurodataTimeIntervalsItemView,
    isTimeView: true
})
viewPlugins.push({
    name: 'PSTH',
    neurodataType: 'TimeIntervals',
    defaultForNeurodataType: false,
    component: PSTHItemView,
    checkEnabled: async (nwbFile: RemoteH5File, path: string) => {
        const rootGroup = await nwbFile.getGroup('/')
        return rootGroup.subgroups.find(sg => (sg.name === 'units')) ? true : false
    },
    isTimeView: false
})

// ElectricalSeries
viewPlugins.push({
    name: 'ElectricalSeries',
    neurodataType: 'ElectricalSeries',
    defaultForNeurodataType: true,
    component: NeurodataElectricalSeriesItemView,
    isTimeView: true
})

// LabeledEvents
viewPlugins.push({
    name: 'LabeledEvents',
    neurodataType: 'LabeledEvents',
    defaultForNeurodataType: true,
    component: LabeledEventsItemView,
    isTimeView: true
})
viewPlugins.push({
    name: 'HelloWorld',
    neurodataType: 'LabeledEvents', // hi-jacking this type for now
    defaultForNeurodataType: false,
    component: HelloWorldView, // see ./HelloWorld/HelloWorldView.tsx
    isTimeView: true
})
// See https://flatironinstitute.github.io/neurosift/#/nwb?url=https://dandiarchive.s3.amazonaws.com/blobs/8cf/38e/8cf38e36-6cd8-4c10-9d74-c2e6be70f019
// for an example that has a LabeledEvents object inside processing/behavior

// ImageSeries
viewPlugins.push({
    name: 'ImageSeries',
    neurodataType: 'ImageSeries',
    defaultForNeurodataType: true,
    component: ImageSeriesItemView,
    isTimeView: false
})

// Units
viewPlugins.push({
    name: 'DirectRasterPlot',
    neurodataType: 'Units',
    defaultForNeurodataType: false,
    buttonLabel: 'raster plot',
    component: DirectRasterPlotUnitsItemView,
    isTimeView: true
})
viewPlugins.push({
    name: 'RasterPlot',
    neurodataType: 'Units',
    defaultForNeurodataType: false,
    buttonLabel: 'precomputed raster plot',
    component: RasterPlotUnitsItemView,
    remoteDataOnly: true,
    isTimeView: true
})
viewPlugins.push({
    name: 'Autocorrelograms',
    neurodataType: 'Units',
    defaultForNeurodataType: false,
    buttonLabel: 'autocorrelograms',
    component: AutocorrelogramsUnitsItemView,
    remoteDataOnly: true,
    isTimeView: false
})

// Images
viewPlugins.push({
    name: 'Images',
    neurodataType: 'Images',
    defaultForNeurodataType: true,
    component: ImagesItemView,
    isTimeView: false
})

// BehavioralEvents
viewPlugins.push({
    name: 'BehavioralEvents',
    neurodataType: 'BehavioralEvents',
    defaultForNeurodataType: true,
    component: BehavioralEventsItemView,
    isTimeView: true
})

///////////////////////////////////////////////////////////////////////////////////////

export const findViewPluginsForType = (neurodataType: string, o: {nwbFile: RemoteH5File}): {viewPlugins: ViewPlugin[], defaultViewPlugin: ViewPlugin | undefined} => {
    const viewPluginsRet: ViewPlugin[] = []
    let defaultViewPlugin: ViewPlugin | undefined
    let nt: string | undefined = neurodataType
    while (nt) {
        const plugins = viewPlugins.filter(p => (p.neurodataType === nt)).filter(p => (!p.remoteDataOnly || o.nwbFile.dataIsRemote))
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