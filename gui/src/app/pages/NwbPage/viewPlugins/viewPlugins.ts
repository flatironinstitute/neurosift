import { RemoteH5FileX, RemoteH5Group } from "@remote-h5-file/index";
import { FunctionComponent } from "react";
// import { neurodataTypeInheritanceRaw } from "../neurodataSpec"
import BehavioralEventsItemView from "./BehavioralEvents/BehavioralEventsItemView";
import DynamicTableView from "./DynamicTable/DynamicTableView";
import ImageSegmentationItemView from "./ImageSegmentation/ImageSegmentationItemView";
// import ImageSeriesItemView from "./ImageSeries/ImageSeriesItemView"
import { NwbFileSpecifications } from "../SpecificationsView/SetupNwbFileSpecificationsProvider";
import { getNeurodataTypeInheritanceRaw } from "../neurodataSpec";
import CEBRAView from "./CEBRA/CEBRAView";
import ElectricalSeriesItemView from "./ElectricalSeriesItemView/ElectricalSeriesItemView";
import ImagesItemView from "./Images/ImagesItemView";
import IntracellularRecordingsTableItemView from "./IntracellularRecordingsTable/IntracellularRecordingsTableItemView";
import LabeledEventsItemView from "./LabeledEvents/LabeledEventsItemView";
import PSTHItemView from "./PSTH/PSTHItemView";
import NeurodataSpatialSeriesItemView from "./SpatialSeries/SpatialSeriesWidget/NeurodataSpatialSeriesItemView";
import SpatialSeriesXYView from "./SpatialSeries/SpatialSeriesWidget/SpatialSeriesXYView";
import TestVideoItemView from "./TestVideo/TestVideoItemView";
import TimeAlignedSeriesItemView from "./TimeAlignedSeries/TimeAlignedSeriesItemView";
import NeurodataTimeIntervalsItemView from "./TimeIntervals/NeurodataTimeIntervalsItemView";
import { default as NeurodataTimeSeriesItemView } from "./TimeSeries/NeurodataTimeSeriesItemView";
import TwoPhotonSeriesItemView from "./TwoPhotonSeries/TwoPhotonSeriesItemView";
import AutocorrelogramsUnitsItemView from "./Units/AutocorrelogramsUnitsItemView";
import AverageWaveformsUnitsItemView from "./Units/AverageWaveformsUnitsItemView";
import DirectRasterPlotUnitsItemView from "./Units/DirectRasterPlotUnitsItemView";
import UnitsItemView from "./Units/UnitsItemView";
import UnitsSummaryItemView from "./Units/UnitsSummaryItemView";
import {
  getCustomPythonCodeForTimeIntervals,
  getCustomPythonCodeForTimeSeries,
  getCustomPythonCodeForUnits,
} from "./customPythonCode";
import TimeSeriesLeftPanelComponent from "./TimeSeries/TimeSeriesLeftPanelComponent";
import UnitLocationsUnitsItemView from "./Units/UnitLocationsUnitsItemView";
import EphysAndUnitsItemView from "./EphysAndUnits/EphysAndUnitsItemView";

type Props = {
  width: number;
  height: number;
  path: string;
  additionalPaths?: string[];
  condensed?: boolean;
  hidden?: boolean;
  initialStateString?: string;
  setStateString?: (stateString: string) => void;
};

export type ViewPlugin = {
  name: string;
  neurodataType: string;
  defaultForNeurodataType?: boolean;
  component: FunctionComponent<Props>;
  leftPanelComponent?: FunctionComponent<{ width: number; path: string }>;
  buttonLabel?: string;
  remoteDataOnly?: boolean;
  checkEnabled?: (nwbFile: RemoteH5FileX, path: string) => Promise<boolean>;
  isTimeView?: boolean;
  usesState?: boolean;
  usesDendro?: boolean;
  getCustomPythonCode?: (group: RemoteH5Group) => string;
  testLinks?: string[];
};

const viewPlugins: ViewPlugin[] = [];

///////////////////////////////////////////////////////////////////////////////////////
// REGISTER VIEW PLUGINS HERE

// ImageSegmentation
viewPlugins.push({
  name: "ImageSegmentation",
  neurodataType: "ImageSegmentation",
  defaultForNeurodataType: true,
  component: ImageSegmentationItemView,
  isTimeView: false,
  testLinks: [
    "https://neurosift.app/?p=/nwb&url=https://dandiarchive.s3.amazonaws.com/blobs/368/fa7/368fa71e-4c93-4f7e-af15-06776ca07f34&tab=neurodata-item:/processing/ophys/ImageSegmentation%7CImageSegmentation",
  ],
});

// SpatialSeries
viewPlugins.push({
  name: "SpatialSeries",
  neurodataType: "SpatialSeries",
  defaultForNeurodataType: true,
  component: NeurodataSpatialSeriesItemView,
  leftPanelComponent: TimeSeriesLeftPanelComponent,
  isTimeView: true,
  getCustomPythonCode: getCustomPythonCodeForTimeSeries,
  testLinks: [
    "https://neurosift.app/?p=/nwb&dandisetId=000960&dandisetVersion=draft&url=https://api.dandiarchive.org/api/assets/9e1a2028-c31e-4c8a-82aa-182901c151af/download/&tab=neurodata-item:/processing/pupilArea/pupilArea/SpatialSeries|SpatialSeries",
  ],
});
viewPlugins.push({
  name: "X/Y",
  neurodataType: "SpatialSeries",
  defaultForNeurodataType: false,
  component: SpatialSeriesXYView,
  leftPanelComponent: TimeSeriesLeftPanelComponent,
  buttonLabel: "X/Y",
  isTimeView: true,
  checkEnabled: async (nwbFile: RemoteH5FileX, path: string) => {
    const grp = await nwbFile.getGroup(path);
    if (!grp) return false;
    const ds = grp.datasets.find((ds) => ds.name === "data");
    if (!ds) return false;
    if (ds.shape.length !== 2) return false;
    if (ds.shape[1] < 2) return false;
    return true;
  },
  testLinks: [
    "https://neurosift.app/?p=/nwb&url=https://fsbucket-dendro.flatironinstitute.org/dendro-outputs/2d2b13fd/2d2b13fd.ec254350/output&dandisetId=000871&dandisetVersion=draft&dandiAssetId=407d6e5f-2a16-4879-b38f-b74cad7b9e24&st=lindi&tab=view:X/Y|/acquisition/EyeTracking/pupil_tracking",
  ],
});

// TwoPhotonSeries
viewPlugins.push({
  name: "TwoPhotonSeries",
  neurodataType: "TwoPhotonSeries",
  defaultForNeurodataType: true,
  component: TwoPhotonSeriesItemView,
  leftPanelComponent: TimeSeriesLeftPanelComponent,
  isTimeView: true,
});

// TwoPhotonSeries
viewPlugins.push({
  name: "OnePhotonSeries",
  neurodataType: "OnePhotonSeries",
  defaultForNeurodataType: true,
  component: TwoPhotonSeriesItemView, // same as TwoPhotonSeries
  leftPanelComponent: TimeSeriesLeftPanelComponent,
  isTimeView: true,
});

// TimeSeries
viewPlugins.push({
  name: "TimeSeries",
  neurodataType: "TimeSeries",
  defaultForNeurodataType: true,
  component: NeurodataTimeSeriesItemView,
  leftPanelComponent: TimeSeriesLeftPanelComponent,
  isTimeView: true,
  getCustomPythonCode: getCustomPythonCodeForTimeSeries,
  testLinks: [
    "https://neurosift.app/?p=/nwb&dandisetId=000954&dandisetVersion=draft&url=https://api.dandiarchive.org/api/assets/dd1bdcf3-5430-4037-ad4a-1727004d38d2/download/&tab=neurodata-items:neurodata-item:/acquisition/OpenLoopKinematics|TimeSeries@neurodata-item:/acquisition/OpenLoopKinematicsVelocity|TimeSeries",
  ],
});

// DynamicTable
viewPlugins.push({
  name: "DynamicTable",
  neurodataType: "DynamicTable",
  defaultForNeurodataType: true,
  component: DynamicTableView,
  isTimeView: false,
  testLinks: [
    "https://neurosift.app/?p=/nwb&url=https://api.dandiarchive.org/api/assets/58703c97-c0a9-4736-b684-73c85c1a444a/download/&dandisetId=000021&dandisetVersion=draft&tab=neurodata-item:/intervals/drifting_gratings_presentations%7CTimeIntervals",
  ],
});

// TimeIntervals
viewPlugins.push({
  name: "TimeIntervals",
  neurodataType: "TimeIntervals",
  defaultForNeurodataType: true,
  component: NeurodataTimeIntervalsItemView,
  isTimeView: true,
  getCustomPythonCode: getCustomPythonCodeForTimeIntervals,
  testLinks: [
    "https://neurosift.app/?p=/nwb&dandisetId=000954&dandisetVersion=draft&url=https://api.dandiarchive.org/api/assets/dd1bdcf3-5430-4037-ad4a-1727004d38d2/download/&tab=neurodata-item:/intervals/epochs|TimeIntervals",
  ],
});
viewPlugins.push({
  name: "PSTH",
  neurodataType: "TimeIntervals",
  defaultForNeurodataType: false,
  component: PSTHItemView,
  checkEnabled: async (nwbFile: RemoteH5FileX, _path: string) => {
    const rootGroup = await nwbFile.getGroup("/");
    if (!rootGroup) return false;
    return rootGroup.subgroups.find((sg) => sg.name === "units") ? true : false;
  },
  isTimeView: false,
  usesState: true,
  testLinks: [
    "https://neurosift.app/?p=/nwb&dandisetId=000409&dandisetVersion=draft&url=https://api.dandiarchive.org/api/assets/c04f6b30-82bf-40e1-9210-34f0bcd8be24/download/&tab=view:PSTH|/intervals/trials",
  ],
});
viewPlugins.push({
  name: "TimeAlignedSeries",
  neurodataType: "TimeIntervals",
  defaultForNeurodataType: false,
  component: TimeAlignedSeriesItemView,
  checkEnabled: async () => {
    return false;
  },
  isTimeView: false,
});

// ElectricalSeries
viewPlugins.push({
  name: "ElectricalSeries",
  neurodataType: "ElectricalSeries",
  defaultForNeurodataType: true,
  component: ElectricalSeriesItemView,
  leftPanelComponent: TimeSeriesLeftPanelComponent,
  isTimeView: true,
  getCustomPythonCode: getCustomPythonCodeForTimeSeries,
  testLinks: [
    "https://neurosift.app/?p=/nwb&dandisetId=000957&dandisetVersion=0.240407.0142&url=https://api.dandiarchive.org/api/assets/d4bd92fc-4119-4393-b807-f007a86778a1/download/",
  ],
});

// LabeledEvents
viewPlugins.push({
  name: "LabeledEvents",
  neurodataType: "LabeledEvents",
  defaultForNeurodataType: true,
  component: LabeledEventsItemView,
  isTimeView: true,
  testLinks: [
    "https://neurosift.app/?p=/nwb&dandisetId=000568&dandisetVersion=0.230705.1633&url=https://api.dandiarchive.org/api/assets/72bebc59-e73e-4d6b-b4ab-086d054583d6/download/&tab=neurodata-item:/processing/behavior/RewardEventsLinearTrack|LabeledEvents",
  ],
});

// viewPlugins.push({
//     name: 'HelloWorld',
//     neurodataType: 'LabeledEvents', // hi-jacking this type for now
//     defaultForNeurodataType: false,
//     component: HelloWorldView, // see ./HelloWorld/HelloWorldView.tsx
//     isTimeView: true
// })
// See https://flatironinstitute.github.io/neurosift/#/nwb?url=https://dandiarchive.s3.amazonaws.com/blobs/8cf/38e/8cf38e36-6cd8-4c10-9d74-c2e6be70f019
// for an example that has a LabeledEvents object inside processing/behavior

// // ImageSeries
// viewPlugins.push({
//     name: 'ImageSeries',
//     neurodataType: 'ImageSeries',
//     defaultForNeurodataType: true,
//     component: ImageSeriesItemView,
//     isTimeView: false
// })

// Units
viewPlugins.push({
  name: "Units",
  neurodataType: "Units",
  defaultForNeurodataType: true,
  component: UnitsItemView,
  isTimeView: false,
  getCustomPythonCode: getCustomPythonCodeForUnits,
});
viewPlugins.push({
  name: "RasterPlot",
  neurodataType: "Units",
  defaultForNeurodataType: false,
  buttonLabel: "raster plot",
  component: DirectRasterPlotUnitsItemView,
  isTimeView: true,
  getCustomPythonCode: getCustomPythonCodeForUnits,
  testLinks: [
    "https://neurosift.app/?p=/nwb&dandisetId=000946&dandisetVersion=draft&url=https://api.dandiarchive.org/api/assets/3764f5c5-0d06-4f24-9bf2-d2849b1e9d0c/download/&tab=view:RasterPlot|/units",
  ],
});
// CEBRA
viewPlugins.push({
  name: "CEBRA",
  neurodataType: "Units",
  defaultForNeurodataType: false,
  component: CEBRAView,
  isTimeView: true,
  usesDendro: true,
  testLinks: [],
});
viewPlugins.push({
  name: "AverageWaveforms",
  neurodataType: "Units",
  defaultForNeurodataType: false,
  buttonLabel: "average waveforms",
  component: AverageWaveformsUnitsItemView,
  isTimeView: false,
  getCustomPythonCode: getCustomPythonCodeForUnits,
  checkEnabled: async (nwbFile: RemoteH5FileX, path: string) => {
    const x = await nwbFile.getGroup(path);
    if (!x) return false;
    const ds = x.datasets.find((ds) => ds.name === "waveform_mean");
    return !!ds;
  },
  testLinks: [
    "https://neurosift.app/?p=/nwb&dandisetId=000939&dandisetVersion=0.240327.2229&url=https://api.dandiarchive.org/api/assets/56d875d6-a705-48d3-944c-53394a389c85/download/&tab=view:AverageWaveforms%7C/units",
  ],
});
// Autocorrelograms
viewPlugins.push({
  name: "Autocorrelograms",
  neurodataType: "Units",
  defaultForNeurodataType: false,
  buttonLabel: "autocorrelograms",
  component: AutocorrelogramsUnitsItemView,
  isTimeView: false,
  getCustomPythonCode: getCustomPythonCodeForUnits,
  checkEnabled: async (nwbFile: RemoteH5FileX, path: string) => {
    const x = await nwbFile.getGroup(path);
    if (!x) return false;
    {
      // old
      const ds = x.datasets.find((ds) => ds.name === "autocorrelogram");
      if (ds) return true;
    }
    {
      // new
      const ds = x.datasets.find((ds) => ds.name === "acg");
      const dsBinEdges = x.datasets.find((ds) => ds.name === "acg_bin_edges");
      if (ds && dsBinEdges) return true;
    }
    return false;
  },
  // testLinks: [
  //   "https://neurosift.app/?p=/nwb&dandisetId=213569&dandisetVersion=draft&staging=1&url=https://api-staging.dandiarchive.org/api/assets/9b372ad4-a3f8-4d95-bda7-dc56637c8873/download/&st=lindi&tab=view:Autocorrelograms|/units",
  // ],
});
// Unit locations
viewPlugins.push({
  name: "UnitLocations",
  neurodataType: "Units",
  defaultForNeurodataType: false,
  buttonLabel: "unit locations",
  component: UnitLocationsUnitsItemView,
  isTimeView: false,
  getCustomPythonCode: getCustomPythonCodeForUnits,
  checkEnabled: async (nwbFile: RemoteH5FileX, path: string) => {
    const x = await nwbFile.getGroup(path);
    if (!x) return false;
    const dx_x = x.datasets.find((ds) => ds.name === "x");
    const dx_y = x.datasets.find((ds) => ds.name === "y");
    return !!dx_x && !!dx_y;
  },
});
// UnitsSummary
viewPlugins.push({
  name: "UnitsSummary",
  neurodataType: "Units",
  defaultForNeurodataType: false,
  buttonLabel: "units summary",
  component: UnitsSummaryItemView,
  isTimeView: false,
  usesDendro: true,
  testLinks: [],
});

// viewPlugins.push({
//     name: 'RasterPlot',
//     neurodataType: 'Units',
//     defaultForNeurodataType: false,
//     buttonLabel: 'precomputed raster plot',
//     component: RasterPlotUnitsItemView,
//     remoteDataOnly: true,
//     isTimeView: true,
//     getCustomPythonCode: getCustomPythonCodeForUnits
// })
// viewPlugins.push({
//     name: 'Autocorrelograms',
//     neurodataType: 'Units',
//     defaultForNeurodataType: false,
//     buttonLabel: 'autocorrelograms',
//     component: AutocorrelogramsUnitsItemView,
//     remoteDataOnly: true,
//     isTimeView: false
// })

// Images
viewPlugins.push({
  name: "Images",
  neurodataType: "Images",
  defaultForNeurodataType: true,
  component: ImagesItemView,
  isTimeView: false,
  testLinks: [
    "https://neurosift.app/?p=/nwb&dandisetId=000957&dandisetVersion=0.240407.0142&url=https://api.dandiarchive.org/api/assets/d4bd92fc-4119-4393-b807-f007a86778a1/download/&tab=neurodata-item:/stimulus/templates/template_118_images|Images",
  ],
});

// BehavioralEvents
viewPlugins.push({
  name: "BehavioralEvents",
  neurodataType: "BehavioralEvents",
  defaultForNeurodataType: true,
  component: BehavioralEventsItemView,
  isTimeView: true,
  testLinks: [
    "https://neurosift.app/?p=/nwb&dandisetId=000115&dandisetVersion=0.210914.1732&url=https://api.dandiarchive.org/api/assets/6df57370-9de8-4514-82f3-65d0f0528cde/download/&tab=neurodata-item:/processing/behavior/behavioral_events|BehavioralEvents",
  ],
});

// IntracellularRecordingsTable
viewPlugins.push({
  name: "IntracellularRecordingsTable",
  neurodataType: "IntracellularRecordingsTable",
  defaultForNeurodataType: true,
  component: IntracellularRecordingsTableItemView,
  isTimeView: false,
  testLinks: [
    "https://neurosift.app/?p=/nwb&url=https://api.dandiarchive.org/api/assets/f7388d54-0525-42f2-b026-04e06a684717/download/&dandisetId=000245&dandisetVersion=draft",
  ],
});

// test_video
viewPlugins.push({
  name: "test_video",
  neurodataType: "test_video",
  defaultForNeurodataType: true,
  component: TestVideoItemView,
  isTimeView: true,
});

// EphysAndUnits
viewPlugins.push({
  name: "EphysAndUnits",
  neurodataType: "ElectricalSeries",
  defaultForNeurodataType: false,
  component: EphysAndUnitsItemView,
  isTimeView: true,
  checkEnabled: async (nwbFile: RemoteH5FileX, path: string) => {
    return false;
  }
});

///////////////////////////////////////////////////////////////////////////////////////

export const findViewPluginsForType = (
  neurodataType: string,
  o: { nwbFile: RemoteH5FileX },
  specifications?: NwbFileSpecifications,
): { viewPlugins: ViewPlugin[]; defaultViewPlugin: ViewPlugin | undefined } => {
  const vp = getViewPlugins({ nwbUrl: o.nwbFile.getUrls()[0] || "" });
  const inheritanceRaw = specifications
    ? getNeurodataTypeInheritanceRaw(specifications)
    : undefined;
  const viewPluginsRet: ViewPlugin[] = [];
  let defaultViewPlugin: ViewPlugin | undefined;
  let nt: string | undefined = neurodataType;
  while (nt) {
    const currentNt = nt; // Store the value of 'nt' in a temporary variable
    const plugins = vp
      .filter((p) => p.neurodataType === currentNt)
      .filter((p) => !p.remoteDataOnly || o.nwbFile.dataIsRemote);
    viewPluginsRet.push(...plugins);
    for (const p of plugins) {
      if (p.defaultForNeurodataType) {
        if (!defaultViewPlugin) defaultViewPlugin = p;
      }
    }
    nt = inheritanceRaw ? inheritanceRaw[nt] : undefined;
  }
  return { viewPlugins: viewPluginsRet, defaultViewPlugin };
};

export const checkUrlIsLocal = (o: { nwbUrl: string }) => {
  return (
    o.nwbUrl.startsWith("http://localhost") ||
    o.nwbUrl.startsWith("http://127.0.0.1")
  );
};

export const getViewPlugins = (o: { nwbUrl: string }) => {
  const urlIsLocal = checkUrlIsLocal(o);
  const dendroViewsEnabled = !urlIsLocal;
  return viewPlugins.filter((p) => {
    if (p.usesDendro && !dendroViewsEnabled) return false;
    return true;
  });
};
