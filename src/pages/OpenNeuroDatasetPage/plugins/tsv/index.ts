import { OpenNeuroPlugin } from "../pluginInterface";
import TsvView from "./TsvView";

const tsvPlugin: OpenNeuroPlugin = {
  name: "tsv",
  type: ["*.tsv"], // Only handle TSV files
  component: TsvView,
  priority: 200, // Higher priority than text plugin (100)
};

export default tsvPlugin;
