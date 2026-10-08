import { lazy } from "react";
import { DatasetPlugin } from "../pluginInterface";

const JsonFileView = lazy(() => import("./JsonFileView"));

const jsonPlugin: DatasetPlugin = {
  name: "json",
  type: ["*.json"], // Handle JSON files, with special handling for dataset description
  component: JsonFileView,
  priority: 100, // High priority for JSON files
};

export default jsonPlugin;
