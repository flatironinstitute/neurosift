import { StatusBar as Bar } from "@ui";
import { useEffect, useState } from "react";
import buildInfo from "../build-info.json";
import { getStatusItems, registerStatusCallback } from "./StatusBarContext";
import { statusWords } from "./statusWords";

/** The app’s status bar: the build, and what the open file has read so far. */
const StatusBar: React.FC = () => {
  const [items, setItems] = useState(getStatusItems());
  useEffect(() => registerStatusCallback(setItems), []);
  return (
    <Bar
      version={`v${buildInfo.version}`}
      items={statusWords(items)}
      details="Counts of the HDF5 groups and datasets Neurosift has read from the open file, and the requests for data the open views have made. Files are read a piece at a time, through LINDI where an index exists."
    />
  );
};

export default StatusBar;
