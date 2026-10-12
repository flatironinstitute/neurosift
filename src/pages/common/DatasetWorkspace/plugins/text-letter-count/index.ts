import { lazy } from "react";
import { DatasetPlugin } from "../pluginInterface";

const TextLetterCountView = lazy(() =>
  import("./TextLetterCountView").then((m) => ({
    default: m.TextLetterCountView,
  })),
);

const plugin: DatasetPlugin = {
  name: "text-letter-count",
  type: ["*.txt", "*.log", "*.md", "README", "CHANGES", "LICENSE"],
  component: TextLetterCountView,
  priority: 1,
};

export default plugin;
