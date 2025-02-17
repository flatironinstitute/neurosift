import { DatasetPlugin } from "../pluginInterface";
import WavFileView from "./WavFileView";

const plugin: DatasetPlugin = {
  name: "wav-viewer",
  type: ["*.wav"],
  component: WavFileView,
  priority: 1,
};

export default plugin;
