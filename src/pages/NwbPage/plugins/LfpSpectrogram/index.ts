import { getHdf5Group } from "@hdf5Interface";
import { NwbObjectViewPlugin } from "../pluginInterface";
import LfpSpectrogramView from "./LfpSpectrogramView";

// True if the object lives under a processing module named "LFP", e.g.
//   /processing/LFP/ElectricalSeries
//   /processing/ecephys/LFP/ElectricalSeries
const isUnderLfpModule = (path: string): boolean => {
  const parts = path.split("/").filter(Boolean);
  if (parts[0] !== "processing") return false;
  return parts.slice(1).some((p) => p === "LFP");
};

export const lfpSpectrogramPlugin: NwbObjectViewPlugin = {
  name: "LfpSpectrogram",
  label: "Spectrogram",
  canHandle: async ({
    nwbUrl,
    path,
    objectType,
  }: {
    nwbUrl: string;
    path: string;
    objectType: "group" | "dataset";
  }) => {
    if (objectType !== "group") return false;
    if (!isUnderLfpModule(path)) return false;

    const group = await getHdf5Group(nwbUrl, path);
    if (!group) return false;

    // Must be a timeseries-like object with a sampled data array.
    const dataDataset = group.datasets.find((ds) => ds.name === "data");
    if (!dataDataset) return false;

    const numDims = dataDataset.shape.length || 0;
    if (![1, 2].includes(numDims)) return false;

    const hasTimestamps = group.datasets.some((ds) => ds.name === "timestamps");
    const hasStartTime = group.datasets.some(
      (ds) => ds.name === "starting_time",
    );
    return hasTimestamps || hasStartTime;
  },
  component: LfpSpectrogramView,
  // Launch from a dedicated button next to the object (like PSTH) rather than
  // rendering inline alongside the main LFP timeseries view.
  launchableFromTable: true,
  hideFromObjectView: true,
  requiresWindowDimensions: true,
  showInMultiView: false,
};

export default lfpSpectrogramPlugin;
