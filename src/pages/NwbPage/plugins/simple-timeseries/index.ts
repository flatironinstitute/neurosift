import { getNwbGroup } from "@nwbInterface";
import { NwbObjectViewPlugin } from "../pluginInterface";
import { SimpleTimeseriesView } from "./SimpleTimeseriesView";

export const simpleTimeseriesPlugin: NwbObjectViewPlugin = {
  name: "SimpleTimeseries",
  canHandle: async ({ nwbUrl, path }: { nwbUrl: string; path: string }) => {
    const group = await getNwbGroup(nwbUrl, path);
    if (!group) return false;

    // Check if we have a data dataset
    const dataDataset = group.datasets.find((ds) => ds.name === "data");
    if (!dataDataset) return false;

    // Check if this is a LabeledEvents neurodata type
    const isLabeledEvents =
      dataDataset.attrs?.neurodata_type === "LabeledEvents";

    // For LabeledEvents, require timestamps and labels
    if (isLabeledEvents) {
      const hasTimestamps = group.datasets.some(
        (ds) => ds.name === "timestamps",
      );
      const hasLabels = dataDataset.attrs?.labels !== undefined;
      return hasTimestamps && hasLabels;
    }

    // Check if we have either timestamps or start_time
    const hasTimestamps = group.datasets.some((ds) => ds.name === "timestamps");
    const hasStartTime = group.datasets.some(
      (ds) => ds.name === "starting_time",
    );
    const hasExternalFile = group.datasets.some(
      (ds) => ds.name === "external_file",
    );

    const numDims = dataDataset.shape.length || 0;
    if (![1, 2].includes(numDims)) return false;

    return (hasTimestamps || hasStartTime) && !hasExternalFile;
  },
  component: SimpleTimeseriesView,
  showInMultiView: true,
};
