import { lazy } from "react";
import { getHdf5Group } from "@hdf5Interface";
import { neurodataTypeInheritsFrom } from "../../neurodataTypeInheritance";
import { NwbObjectViewPlugin } from "../pluginInterface";
import { hasLfpInPathName, isUnderLfpModule } from "./lfpDetection";

const LfpSpectrogramView = lazy(() => import("./LfpSpectrogramView"));

export const lfpSpectrogramPlugin: NwbObjectViewPlugin = {
  name: "LfpSpectrogram",
  label: "Spectrogram",
  canHandle: async ({ nwbUrl, path, objectType, specifications }) => {
    if (objectType !== "group") return false;
    const underLfpModule = isUnderLfpModule(path);
    if (!underLfpModule && !hasLfpInPathName(path)) return false;

    const group = await getHdf5Group(nwbUrl, path);
    if (!group) return false;

    // Outside an LFP processing module, only accept an ElectricalSeries (or
    // subtype) whose own name or container name mentions LFP.
    if (
      !underLfpModule &&
      !neurodataTypeInheritsFrom(
        group.attrs.neurodata_type,
        "ElectricalSeries",
        specifications,
      )
    ) {
      return false;
    }

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
