import { NwbObjectViewPlugin } from "../pluginInterface";
import DefaultView from "./DefaultView";

export const defaultPlugin: NwbObjectViewPlugin = {
  name: "default",
  canHandle: async () => true, // Can handle any object as fallback
  component: DefaultView,
};
