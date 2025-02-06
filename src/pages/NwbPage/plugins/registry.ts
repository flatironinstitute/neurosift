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

// List of plugins in priority order (last one is checked first)
export const nwbObjectViewPlugins: NwbObjectViewPlugin[] = [
  defaultPlugin,
  behavioralEventsPlugin,
  dynamicTablePlugin,
  twoPhotonSeriesPlugin,
  spatialSeriesPlugin,
  simpleTimeseriesPlugin,
  psthPlugin,
  rasterPlugin,
  imagePlugin,
  imageSegmentationPlugin,
  timeIntervalsPlugin,
  trialAlignedSeriesPlugin,
];

export const findSuitablePlugins = async (
  nwbUrl: string,
  path: string,
  objectType: "group" | "dataset",
  o: { special?: boolean; secondaryPaths?: string[] },
): Promise<NwbObjectViewPlugin[]> => {
  const ret: NwbObjectViewPlugin[] = [];
  for (let i = 0; i < nwbObjectViewPlugins.length; i++) {
    const plugin = nwbObjectViewPlugins[i];
    if (!!plugin.special === !!o.special) {
      if (
        await plugin.canHandle({
          nwbUrl,
          objectType,
          path,
          secondaryPaths: o.secondaryPaths,
        })
      ) {
        ret.push(plugin);
      }
    }
  }
  return ret;
};

export const findPluginByName = (
  name: string,
): NwbObjectViewPlugin | undefined => {
  return nwbObjectViewPlugins.find((plugin) => plugin.name === name);
};
