import { lazy } from "react";
import { DatasetPlugin } from "../pluginInterface";

const WavFileView = lazy(() => import("./WavFileView"));

const plugin: DatasetPlugin = {
  name: "wav-viewer",
  type: ["*.wav"],
  component: WavFileView,
  priority: 1,
};

export default plugin;
