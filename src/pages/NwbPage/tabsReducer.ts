import { NwbObjectViewPlugin } from "./plugins/pluginInterface";

type BaseTab = {
  id: string;
  label: string;
};

type MainTab = BaseTab & {
  type: "main";
};

export type SingleObjectTab = BaseTab & {
  type: "single";
  path: string;
  objectType: "group" | "dataset";
  plugin?: NwbObjectViewPlugin;
  secondaryPaths?: string[];
};

type MultiObjectTab = BaseTab & {
  type: "multi";
  paths: string[];
  objectTypes: ("group" | "dataset")[];
};

type DynamicTab = MainTab | SingleObjectTab | MultiObjectTab;

type TabsAction =
  | {
      type: "OPEN_TAB";
      id: string;
      path: string;
      objectType: "group" | "dataset";
      plugin?: NwbObjectViewPlugin;
      secondaryPaths?: string[];
    }
  | {
      type: "OPEN_MULTI_TAB";
      paths: string[];
      objectTypes: ("group" | "dataset")[];
    }
  | { type: "CLOSE_TAB"; id: string }
  | { type: "SWITCH_TO_TAB"; id: string };

export type TabsState = {
  tabs: DynamicTab[];
  activeTabId: string;
};

const generateMultiTabId = (paths: string[]) => {
  return JSON.stringify(paths);
};

const tabsReducer = (state: TabsState, action: TabsAction): TabsState => {
  switch (action.type) {
    case "OPEN_MULTI_TAB": {
      if (!action.paths.length) return state;

      const id = generateMultiTabId(action.paths);

      // Check if tab with same paths already exists
      const existingTab = state.tabs.find((tab) => tab.id === id);
      if (existingTab) {
        return {
          ...state,
          activeTabId: existingTab.id,
        };
      }

      const newTab: MultiObjectTab = {
        id,
        type: "multi",
        label: `${action.paths.length} items`,
        paths: action.paths,
        objectTypes: action.objectTypes,
      };

      return {
        tabs: [...state.tabs, newTab],
        activeTabId: id,
      };
    }

    case "OPEN_TAB": {
      const id = action.id;
      // Check if tab with same path already exists
      const existingTab = state.tabs.find((tab) => tab.id === id);
      if (existingTab) {
        return {
          ...state,
          activeTabId: existingTab.id,
        };
      }

      const label = action.path.split("/").pop() || "Untitled";
      const newTab: SingleObjectTab = {
        id,
        type: "single",
        label,
        path: action.path,
        objectType: action.objectType,
        plugin: action.plugin,
        secondaryPaths: action.secondaryPaths,
      };

      return {
        tabs: [...state.tabs, newTab],
        activeTabId: id,
      };
    }

    case "SWITCH_TO_TAB": {
      return {
        ...state,
        activeTabId: action.id,
      };
    }

    case "CLOSE_TAB": {
      const newTabs = state.tabs.filter((tab) => tab.id !== action.id);
      return {
        tabs: newTabs,
        // If closing active tab, activate the last tab or main if no tabs remain
        activeTabId:
          state.activeTabId === action.id
            ? newTabs.length > 0
              ? newTabs[newTabs.length - 1].id
              : "main"
            : state.activeTabId,
      };
    }

    default:
      return state;
  }
};

export default tabsReducer;
