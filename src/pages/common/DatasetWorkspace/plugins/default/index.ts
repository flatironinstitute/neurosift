import { DatasetPlugin } from "../pluginInterface";
import DefaultFileView from "./DefaultFileView";

const defaultPlugin: DatasetPlugin = {
  name: "default",
  // Support all file types with lowest priority
  type: ["*"],
  component: DefaultFileView,
  priority: -1, // Lowest priority so other plugins can override for specific file types
};

export default defaultPlugin;
