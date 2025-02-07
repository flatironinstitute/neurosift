import { OpenNeuroPlugin } from "../pluginInterface";
import TextFileView from "./TextFileView";

const textPlugin: OpenNeuroPlugin = {
  name: "text",
  type: ["*.tsv", "*.txt", "CHANGES", "README"],
  component: TextFileView,
  priority: 100,
};

export default textPlugin;
