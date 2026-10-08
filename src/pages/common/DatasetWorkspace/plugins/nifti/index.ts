import { lazy } from "react";
import { DatasetPlugin } from "../pluginInterface";

const NiftiView = lazy(() => import("./NiftiView"));

const niftiPlugin: DatasetPlugin = {
  name: "nifti",
  type: ["*.nii", "*.nii.gz"], // Support NIfTI files with gzip compression
  component: NiftiView,
  priority: 1, // Higher priority than default plugin
};

export default niftiPlugin;
