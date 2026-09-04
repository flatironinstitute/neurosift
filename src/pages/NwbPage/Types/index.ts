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
  plugins: (NwbObjectViewPlugin | undefined)[];
  secondaryPathsList: (string[] | undefined)[];
}

export type DynamicTab = MainTab | SingleTab | MultiTab;

export interface TabsState {
  tabs: DynamicTab[];
  activeTabId: string;
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

// Overview types (previously in NwbPage/types.ts, which collided with this
// directory's name on case-insensitive filesystems and broke the build on
// macOS and Windows).
/* eslint-disable @typescript-eslint/no-explicit-any */
export type NwbFileOverview = {
  items: {
    name: string;
    path: string;
    renderer?: (val: any) => string;
  }[];
  nwbVersion: string;
};

export type GeneralLabelMapItem = {
  name: string;
  newName: string;
  renderer?: (val: any) => string;
};
