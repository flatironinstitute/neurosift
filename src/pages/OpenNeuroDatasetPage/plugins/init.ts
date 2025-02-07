import { registerPlugin } from "./registry";
import defaultPlugin from "./default";
import jsonPlugin from "./json";
import textPlugin from "./text";

// Register plugins in order of priority
export const initializePlugins = () => {
  registerPlugin(textPlugin);
  registerPlugin(jsonPlugin);
  registerPlugin(defaultPlugin);
};
