import { FunctionComponent, useMemo } from "react";
import { Hdf5Group, useHdf5Group } from "@hdf5Interface";
import {
  getCustomPythonCodeForTimeIntervals,
  getCustomPythonCodeForTimeSeries,
  getCustomPythonCodeForUnits,
} from "./customPythonCode";
import { neurodataTypeInheritsFrom } from "../../neurodataTypeInheritance";
import { useNwbFileSpecifications } from "../../SpecificationsView/SetupNwbFileSpecificationsProvider";
import PythonCode from "../../components/PythonCode";

type Props = {
  nwbUrl: string;
  path: string;
};

const LoadInPythonWindow: FunctionComponent<Props> = ({ nwbUrl, path }) => {
  const group = useHdf5Group(nwbUrl, path);
  const specifications = useNwbFileSpecifications();

  const customCode = useMemo(() => {
    if (!group) return "";
    const nt = group.attrs.neurodata_type;
    if (isTimeSeriesGroup(group)) {
      return getCustomPythonCodeForTimeSeries(group);
    } else if (neurodataTypeInheritsFrom(nt, "TimeIntervals", specifications)) {
      return getCustomPythonCodeForTimeIntervals(group);
    } else if (neurodataTypeInheritsFrom(nt, "Units", specifications)) {
      return getCustomPythonCodeForUnits(group);
    } else {
      return "";
    }
  }, [group, specifications]);

  const source: string = useMemo(() => {
    if (!group) return "";
    return createSource(nwbUrl, "hdf5", path, group, customCode);
  }, [nwbUrl, path, group, customCode]);
  if (!group) return null;
  return (
    <PythonCode
      install="pip install --upgrade lindi"
      script={source}
      expandLabel="Load in Python"
    />
  );
};

const isTimeSeriesGroup = (group: Hdf5Group) => {
  // Check if we have a data dataset
  const dataDataset = group.datasets.find((ds) => ds.name === "data");
  if (!dataDataset) return false;

  // Check if we have either timestamps or start_time
  const hasTimestamps = group.datasets.some((ds) => ds.name === "timestamps");
  const hasStartTime = group.datasets.some((ds) => ds.name === "starting_time");
  const hasExternalFile = group.datasets.some(
    (ds) => ds.name === "external_file",
  );

  return (hasTimestamps || hasStartTime) && !hasExternalFile;
};

const createSource = (
  nwbUrl: string,
  urlType: "hdf5" | "lindi",
  path: string,
  group: Hdf5Group,
  customCode: string,
) => {
  return `import lindi

url = '${nwbUrl}'

local_cache = lindi.LocalCache()

# Load the remote file
${urlType === "lindi" ? "f = lindi.LindiH5pyFile.from_lindi_file(url, local_cache=local_cache)" : "f = lindi.LindiH5pyFile.from_hdf5_file(url, local_cache=local_cache)"}

# load the neurodata object (${group.attrs.neurodata_type})
X = f['${path}']
${customCode}`.trimEnd();
};

export default LoadInPythonWindow;
