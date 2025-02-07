import { registerPlugin } from "./registry";
import defaultPlugin from "./default";
import jsonPlugin from "./json";
import textPlugin from "./text";
import edfPlugin from "./edf";

// Register plugins in order of priority
export const initializePlugins = () => {
  registerPlugin(textPlugin);
  registerPlugin(jsonPlugin);
  registerPlugin(edfPlugin);
  registerPlugin(defaultPlugin);
};
