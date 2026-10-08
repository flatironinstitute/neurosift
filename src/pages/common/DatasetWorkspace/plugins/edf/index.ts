import { lazy } from "react";
import { DatasetPlugin } from "../pluginInterface";

const EdfFileView = lazy(() => import("./EdfFileView"));

const edfPlugin: DatasetPlugin = {
  name: "edf",
  type: ["*.edf"], // Handle EDF files
  component: EdfFileView,
  priority: 100, // High priority for EDF files
};

export default edfPlugin;
