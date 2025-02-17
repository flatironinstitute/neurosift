import { FunctionComponent, useMemo } from "react";
import Markdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vs } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Hdf5Group, useHdf5Group } from "@hdf5Interface";
import {
  getCustomPythonCodeForTimeIntervals,
  getCustomPythonCodeForTimeSeries,
  getCustomPythonCodeForUnits,
} from "./customPythonCode";

type Props = {
  nwbUrl: string;
  path: string;
};

const LoadInPythonWindow: FunctionComponent<Props> = ({ nwbUrl, path }) => {
  const group = useHdf5Group(nwbUrl, path);

  const customCode = useMemo(() => {
    if (!group) return "";
    if (isTimeSeriesGroup(group)) {
      return getCustomPythonCodeForTimeSeries(group);
    } else if (group.attrs.neurodata_type === "TimeIntervals") {
      return getCustomPythonCodeForTimeIntervals(group);
    } else if (group.attrs.neurodata_type === "Units") {
      return getCustomPythonCodeForUnits(group);
    } else {
      return "";
    }
  }, [group]);

  const source: string = useMemo(() => {
    if (!group) return "";
    return createSource(nwbUrl, "hdf5", path, group, customCode);
  }, [nwbUrl, path, group, customCode]);
  return (
    <Markdown
      children={source}
      components={{
        code(props) {
          const { children, className } = props;
          const match = /language-(\w+)/.exec(className || "");
          const language = match ? match[1] : "";
          return language ? (
            <SyntaxHighlighter style={vs} language={language} PreTag="div">
              {String(children).replace(/\n$/, "")}
            </SyntaxHighlighter>
          ) : (
            <code className={className}>{children}</code>
          );
        },
      }}
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
  const backtics = "```";
  // const backtic = "`";
  // const nt = group.attrs.neurodata_type
  return `

${backtics}bash
# Prerequisites:
pip install --upgrade lindi
${backtics}

---

${backtics}python

import lindi

url = '${nwbUrl}'

# Load the remote file
${urlType === "lindi" ? "f = lindi.LindiH5pyFile.from_lindi_file(url)" : "f = lindi.LindiH5pyFile.from_hdf5_file(url)"}

# load the neurodata object (${group.attrs.neurodata_type})
X = f['${path}']
${customCode}
${backtics}

---

See [lindi](https://github.com/neurodatawithoutborders/lindi)
`;
};

export default LoadInPythonWindow;
