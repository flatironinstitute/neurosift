import { lazy } from "react";
import { DatasetPlugin } from "../pluginInterface";

const SnirfView = lazy(() => import("./SnirfView"));

export const snirfPlugin: DatasetPlugin = {
  name: "snirf",
  type: ["*.snirf"],
  component: SnirfView,
  priority: 1,
};

export default snirfPlugin;
