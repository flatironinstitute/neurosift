import { NwbObjectViewPlugin } from "../plugins/pluginInterface";

export type ObjectType = "group" | "dataset";

export interface BaseTab {
  id: string;
  label: string;
}

export interface MainTab extends BaseTab {
  type: "main";
}

export interface SingleTab extends BaseTab {
  type: "single";
  path: string;
  objectType: ObjectType;
  plugin?: NwbObjectViewPlugin;
  secondaryPaths?: string[];
}

export interface MultiTab extends BaseTab {
  type: "multi";
  paths: string[];
  objectTypes: ObjectType[];
}

export type DynamicTab = MainTab | SingleTab | MultiTab;

export interface TabsState {
  tabs: DynamicTab[];
  activeTabId: string;
}

export interface TabContentProps {
  nwbUrl: string;
  width: number;
  height: number;
  onOpenObjectInNewTab: (
    path: string,
    plugin?: NwbObjectViewPlugin,
    secondaryPaths?: string[],
  ) => void;
  onOpenObjectsInNewTab: (paths: string[]) => void;
}

// Action types for the tabs reducer
export type TabsAction =
  | {
      type: "OPEN_TAB";
      id: string;
      path: string;
      objectType: ObjectType;
      plugin?: NwbObjectViewPlugin;
      secondaryPaths?: string[];
    }
  | {
      type: "OPEN_MULTI_TAB";
      paths: string[];
      objectTypes: ObjectType[];
    }
  | { type: "CLOSE_TAB"; id: string }
  | { type: "SWITCH_TO_TAB"; id: string };
