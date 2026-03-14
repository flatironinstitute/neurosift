import { behavioralEventsPlugin } from "./BehavioralEvents";
import { defaultPlugin } from "./default";
import { dynamicTablePlugin } from "./dynamic-table";
import { electrodePositionsPlugin } from "./ElectrodePositions";
import { twoPhotonSeriesPlugin } from "./TwoPhotonSeries";
import { NwbObjectViewPlugin } from "./pluginInterface";
import { simpleTimeseriesPlugin } from "./simple-timeseries";
import { psthPlugin } from "./PSTH";
import { rasterPlugin } from "./Raster";
import imagePlugin from "./Image";
import { spatialSeriesPlugin } from "./SpatialSeries";
import {
  imageSegmentationPlugin,
  planeSegmentationPlugin,
} from "./ImageSegmentation";
import { timeIntervalsPlugin } from "./TimeIntervals";
import { trialAlignedSeriesPlugin } from "./TrialAlignedSeries";
import { pythonScriptPlugin } from "./PythonScript";
// import spikeDensityPlugin from "./SpikeDensity";
import { intervalSeriesPlugin } from "./IntervalSeries";
import { eventsPlugin } from "./Events";
import { imageSeriesMp4Plugin } from "./ImageSeriesMp4";
import { NwbFileSpecifications } from "../SpecificationsView/SetupNwbFileSpecificationsProvider";
import {
  FigpackPoseEstimationPlugin,
  figpackVideoPreviewPlugin,
  figpackRasterPlotPlugin,
} from "./Figpack";

// List of plugins in order they will appear in the UI when a single object is being viewed
export const nwbObjectViewPlugins: NwbObjectViewPlugin[] = [
  eventsPlugin,
  intervalSeriesPlugin,

  behavioralEventsPlugin,
  electrodePositionsPlugin,
  dynamicTablePlugin,
  twoPhotonSeriesPlugin,
  spatialSeriesPlugin,
  simpleTimeseriesPlugin,
  psthPlugin,
  imagePlugin,
  imageSegmentationPlugin,
  planeSegmentationPlugin,
  timeIntervalsPlugin,
  trialAlignedSeriesPlugin,

  imageSeriesMp4Plugin,

  rasterPlugin,
  // spikeDensityPlugin,

  figpackRasterPlotPlugin,
  figpackVideoPreviewPlugin,
  FigpackPoseEstimationPlugin,

  defaultPlugin,
  pythonScriptPlugin,
];

export const findSuitablePlugins = async (
  nwbUrl: string,
  path: string,
  objectType: "group" | "dataset",
  o: {
    specifications?: NwbFileSpecifications;
    launchableFromTable?: boolean;
    defaultUnitsPath?: string;
  },
): Promise<NwbObjectViewPlugin[]> => {
  const ret: NwbObjectViewPlugin[] = [];
  for (let i = 0; i < nwbObjectViewPlugins.length; i++) {
    const plugin = nwbObjectViewPlugins[i];
    if (o.launchableFromTable && !plugin.launchableFromTable) {
      continue;
    }
    if (plugin.requiredDefaultUnits && !o.defaultUnitsPath) {
      continue;
    }
    if (
      await plugin.canHandle({
        nwbUrl,
        objectType,
        path,
        specifications: o.specifications,
        secondaryPaths: plugin.requiredDefaultUnits
          ? [o.defaultUnitsPath!]
          : [],
      })
    ) {
      ret.push(plugin);
    }
  }
  return ret;
};

export const findPluginByName = (
  name: string,
): NwbObjectViewPlugin | undefined => {
  return nwbObjectViewPlugins.find((plugin) => plugin.name === name);
};
