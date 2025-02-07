import { OpenNeuroPlugin } from "../pluginInterface";
import JsonFileView from "./JsonFileView";

const jsonPlugin: OpenNeuroPlugin = {
  name: "json",
  type: [".json"], // Handle JSON files
  component: JsonFileView,
  priority: 100, // High priority for JSON files
};

export default jsonPlugin;
