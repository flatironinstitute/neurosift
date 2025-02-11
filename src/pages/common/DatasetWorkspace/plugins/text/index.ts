import { DatasetPlugin } from "../pluginInterface";
import TextFileView from "./TextFileView";

const textPlugin: DatasetPlugin = {
  name: "text",
  type: ["*.tsv", "*.txt", "CHANGES", "README"],
  component: TextFileView,
  priority: 100,
};

export default textPlugin;
