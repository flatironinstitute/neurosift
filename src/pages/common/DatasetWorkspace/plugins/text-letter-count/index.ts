import { DatasetPlugin } from "../pluginInterface";
import { TextLetterCountView } from "./TextLetterCountView";

const plugin: DatasetPlugin = {
  name: "text-letter-count",
  type: ["*.txt", "*.log", "*.md", "README", "CHANGES", "LICENSE"],
  component: TextLetterCountView,
  priority: 1,
};

export default plugin;
