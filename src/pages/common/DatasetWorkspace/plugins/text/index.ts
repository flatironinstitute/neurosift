import { lazy } from "react";
import { DatasetPlugin } from "../pluginInterface";

const TextFileView = lazy(() => import("./TextFileView"));

const textPlugin: DatasetPlugin = {
  name: "text",
  type: ["*.tsv", "*.txt", "CHANGES", "README", "*.bvals", "*.bvecs"],
  component: TextFileView,
  priority: 100,
};

export default textPlugin;
