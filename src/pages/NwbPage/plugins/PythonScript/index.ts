import { lazy } from "react";
import { NwbObjectViewPlugin } from "../pluginInterface";

const PythonScriptPluginView = lazy(() => import("./PythonScriptPluginView"));

export const pythonScriptPlugin: NwbObjectViewPlugin = {
  name: "PythonScript",
  canHandle: async () => true, // Can handle any object
  component: PythonScriptPluginView,
  showInMultiView: false,
};
