import { NwbObjectViewPlugin } from "../plugins/pluginInterface";

export type ObjectType = "group" | "dataset";

export interface SingleSubView {
  type: "single";
  path: string;
  objectType: ObjectType;
  plugin?: NwbObjectViewPlugin;
  secondaryPaths?: string[];
}

export interface MultiSubView {
  type: "multi";
  paths: string[];
  objectTypes: ObjectType[];
  plugins: (NwbObjectViewPlugin | undefined)[];
  secondaryPathsList: (string[] | undefined)[];
}

export type NeurodataSubView = SingleSubView | MultiSubView;

export interface TabsState {
  activeTabId: string;
  neurodataSubView: NeurodataSubView | null;
}

export type TabsAction =
  | {
      type: "SET_SINGLE_SUBVIEW";
      path: string;
      objectType: ObjectType;
      plugin?: NwbObjectViewPlugin;
      secondaryPaths?: string[];
    }
  | {
      type: "SET_MULTI_SUBVIEW";
      paths: string[];
      objectTypes: ObjectType[];
    }
  | { type: "CLEAR_SUBVIEW" }
  | { type: "SWITCH_TO_TAB"; id: string };
