import { DatasetPlugin } from "../pluginInterface";
import NiftiView from "./NiftiView";

const niftiPlugin: DatasetPlugin = {
  name: "nifti",
  type: ["*.nii.gz"], // Support NIFTI files with gzip compression
  component: NiftiView,
  priority: 1, // Higher priority than default plugin
};

export default niftiPlugin;
