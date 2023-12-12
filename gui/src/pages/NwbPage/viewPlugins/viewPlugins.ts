import { FunctionComponent } from "react"
import { MergedRemoteH5File, RemoteH5File, RemoteH5Group } from "@fi-sci/remote-h5-file"
import { neurodataTypeInheritanceRaw } from "../neurodataSpec"
import BehavioralEventsItemView from "./BehavioralEvents/BehavioralEventsItemView"
import DynamicTableView from "./DynamicTable/DynamicTableView"
import TimeSeriesItemView from "./TimeSeries/NeurodataTimeSeriesItemView"
import ImageSegmentationItemView from "./ImageSegmentation/ImageSegmentationItemView"
import ImageSeriesItemView from "./ImageSeries/ImageSeriesItemView"
import ImagesItemView from "./Images/ImagesItemView"
import LabeledEventsItemView from "./LabeledEvents/LabeledEventsItemView"
import PSTHItemView from "./PSTH/PSTHItemView"
import NeurodataSpatialSeriesItemView from "./SpatialSeries/SpatialSeriesWidget/NeurodataSpatialSeriesItemView"
import SpatialSeriesXYView from "./SpatialSeries/SpatialSeriesWidget/SpatialSeriesXYView"
import NeurodataTimeIntervalsItemView from "./TimeIntervals/NeurodataTimeIntervalsItemView"
import NeurodataTimeSeriesItemView from "./TimeSeries/NeurodataTimeSeriesItemView"
import TwoPhotonSeriesItemView from "./TwoPhotonSeries/TwoPhotonSeriesItemView"
import AutocorrelogramsUnitsItemView from "./Units/AutocorrelogramsUnitsItemView"
import DirectRasterPlotUnitsItemView from "./Units/DirectRasterPlotUnitsItemView"
import RasterPlotUnitsItemView from "./Units/RasterPlotUnitsItemView"
import UnitsItemView from "./Units/UnitsItemView"
import { getCustomPythonCodeForTimeIntervals, getCustomPythonCodeForTimeSeries, getCustomPythonCodeForUnits } from "./customPythonCode"

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
    checkEnabled?: (nwbFile: RemoteH5File | MergedRemoteH5File, path: string) => Promise<boolean>
    isTimeView?: boolean
    getCustomPythonCode?: (group: RemoteH5Group) => string
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
    isTimeView: true,
    getCustomPythonCode: getCustomPythonCodeForTimeSeries
})
viewPlugins.push({
    name: 'X/Y',
    neurodataType: 'SpatialSeries',
    defaultForNeurodataType: false,
    component: SpatialSeriesXYView,
    buttonLabel: 'X/Y',
    isTimeView: true,
    checkEnabled: async (nwbFile: RemoteH5File | MergedRemoteH5File, path: string) => {
        const grp = await nwbFile.getGroup(path)
        if (!grp) return false
        const ds = grp.datasets.find(ds => (ds.name === 'data'))
        if (!ds) return false
        if (ds.shape.length !== 2) return false
        if (ds.shape[1] < 2) return false
        return true
    },
})

// TwoPhotonSeries
viewPlugins.push({
    name: 'TwoPhotonSeries',
    neurodataType: 'TwoPhotonSeries',
    defaultForNeurodataType: true,
    component: TwoPhotonSeriesItemView,
    isTimeView: true
})

// TwoPhotonSeries
viewPlugins.push({
    name: 'OnePhotonSeries',
    neurodataType: 'OnePhotonSeries',
    defaultForNeurodataType: true,
    component: TwoPhotonSeriesItemView, // same as TwoPhotonSeries
    isTimeView: true
})

// TimeSeries
viewPlugins.push({
    name: 'TimeSeries',
    neurodataType: 'TimeSeries',
    defaultForNeurodataType: true,
    component: NeurodataTimeSeriesItemView,
    isTimeView: true,
    getCustomPythonCode: getCustomPythonCodeForTimeSeries
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
    isTimeView: true,
    getCustomPythonCode: getCustomPythonCodeForTimeIntervals
})
viewPlugins.push({
    name: 'PSTH',
    neurodataType: 'TimeIntervals',
    defaultForNeurodataType: false,
    component: PSTHItemView,
    checkEnabled: async (nwbFile: RemoteH5File | MergedRemoteH5File, path: string) => {
        const rootGroup = await nwbFile.getGroup('/')
        if (!rootGroup) return false
        return rootGroup.subgroups.find(sg => (sg.name === 'units')) ? true : false
    },
    isTimeView: false
})

// ElectricalSeries
viewPlugins.push({
    name: 'ElectricalSeries',
    neurodataType: 'ElectricalSeries',
    defaultForNeurodataType: true,
    component: TimeSeriesItemView,
    isTimeView: true,
    getCustomPythonCode: getCustomPythonCodeForTimeSeries
})

// LabeledEvents
viewPlugins.push({
    name: 'LabeledEvents',
    neurodataType: 'LabeledEvents',
    defaultForNeurodataType: true,
    component: LabeledEventsItemView,
    isTimeView: true
})
// viewPlugins.push({
//     name: 'HelloWorld',
//     neurodataType: 'LabeledEvents', // hi-jacking this type for now
//     defaultForNeurodataType: false,
//     component: HelloWorldView, // see ./HelloWorld/HelloWorldView.tsx
//     isTimeView: true
// })
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
    name: 'Units',
    neurodataType: 'Units',
    defaultForNeurodataType: true,
    component: UnitsItemView,
    isTimeView: false,
    getCustomPythonCode: getCustomPythonCodeForUnits
})
viewPlugins.push({
    name: 'DirectRasterPlot',
    neurodataType: 'Units',
    defaultForNeurodataType: false,
    buttonLabel: 'raster plot',
    component: DirectRasterPlotUnitsItemView,
    isTimeView: true,
    getCustomPythonCode: getCustomPythonCodeForUnits
})
viewPlugins.push({
    name: 'RasterPlot',
    neurodataType: 'Units',
    defaultForNeurodataType: false,
    buttonLabel: 'precomputed raster plot',
    component: RasterPlotUnitsItemView,
    remoteDataOnly: true,
    isTimeView: true,
    getCustomPythonCode: getCustomPythonCodeForUnits
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

export const findViewPluginsForType = (neurodataType: string, o: {nwbFile: RemoteH5File | MergedRemoteH5File}): {viewPlugins: ViewPlugin[], defaultViewPlugin: ViewPlugin | undefined} => {
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