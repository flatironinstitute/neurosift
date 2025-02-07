import { OpenNeuroPlugin } from "../pluginInterface";
import EdfFileView from "./EdfFileView";

const edfPlugin: OpenNeuroPlugin = {
  name: "edf",
  type: ["*.edf"], // Handle EDF files
  component: EdfFileView,
  priority: 100, // High priority for EDF files
};

export default edfPlugin;
