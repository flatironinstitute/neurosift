import { NwbObjectViewPlugin } from "../pluginInterface";
import PythonScriptPluginView from "./PythonScriptPluginView";

export const pythonScriptPlugin: NwbObjectViewPlugin = {
  name: "PythonScript",
  canHandle: async () => true, // Can handle any object
  component: PythonScriptPluginView,
};
