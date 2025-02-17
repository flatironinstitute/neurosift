import { DatasetPlugin } from "../pluginInterface";
import SnirfView from "./SnirfView";

export const snirfPlugin: DatasetPlugin = {
  name: "snirf",
  type: ["*.snirf"],
  component: SnirfView,
  priority: 1,
};

export default snirfPlugin;
