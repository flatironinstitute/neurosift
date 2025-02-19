import { behavioralEventsPlugin } from "./BehavioralEvents";
import { defaultPlugin } from "./default";
import { dynamicTablePlugin } from "./dynamic-table";
import { twoPhotonSeriesPlugin } from "./TwoPhotonSeries";
import { NwbObjectViewPlugin } from "./pluginInterface";
import { simpleTimeseriesPlugin } from "./simple-timeseries";
import { psthPlugin } from "./PSTH";
import { rasterPlugin } from "./Raster";
import imagePlugin from "./Image";
import { spatialSeriesPlugin } from "./SpatialSeries";
import { imageSegmentationPlugin } from "./ImageSegmentation";
import { timeIntervalsPlugin } from "./TimeIntervals";
import { trialAlignedSeriesPlugin } from "./TrialAlignedSeries";
import { pythonScriptPlugin } from "./PythonScript";
import spikeDensityPlugin from "./SpikeDensity";

// List of plugins in order they will appear in the UI when a single object is being viewed
export const nwbObjectViewPlugins: NwbObjectViewPlugin[] = [
  behavioralEventsPlugin,
  dynamicTablePlugin,
  twoPhotonSeriesPlugin,
  spatialSeriesPlugin,
  simpleTimeseriesPlugin,
  psthPlugin,
  imagePlugin,
  imageSegmentationPlugin,
  timeIntervalsPlugin,
  trialAlignedSeriesPlugin,

  rasterPlugin,
  spikeDensityPlugin,

  defaultPlugin,
  pythonScriptPlugin,
];

export const findSuitablePlugins = async (
  nwbUrl: string,
  path: string,
  objectType: "group" | "dataset",
  o: { launchableFromTable?: boolean; defaultUnitsPath?: string },
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
