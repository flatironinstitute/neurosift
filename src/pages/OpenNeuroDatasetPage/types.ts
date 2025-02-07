import { BaseTab, createTabsReducer } from "@components/tabs/tabsReducer";
import { OpenNeuroFile } from "./plugins/pluginInterface";

type MainTab = BaseTab & {
  type: "main";
};

type FileTab = BaseTab & {
  type: "file";
  file: OpenNeuroFile;
};

export type OpenNeuroTab = MainTab | FileTab;

export type OpenNeuroTabsState = {
  tabs: OpenNeuroTab[];
  activeTabId: string;
};

type OpenNeuroOpenTabAction = {
  type: "OPEN_TAB";
  file: OpenNeuroFile;
};

// Actions can be either our custom OPEN_TAB action or the base tab actions
// The base actions (CLOSE_TAB and SWITCH_TO_TAB) are handled by the base reducer
export type OpenNeuroTabAction = OpenNeuroOpenTabAction;

const customReducer = (
  state: OpenNeuroTabsState,
  action: OpenNeuroTabAction,
): OpenNeuroTabsState => {
  if (action.type === "OPEN_TAB") {
    const existingTab = state.tabs.find(
      (t) => t.type === "file" && t.file.id === action.file.id,
    );
    if (existingTab) {
      return {
        ...state,
        activeTabId: existingTab.id,
      };
    }

    const newTab: FileTab = {
      id: action.file.id,
      label: action.file.filename.split("/").pop() || action.file.filename,
      type: "file",
      file: action.file,
    };

    return {
      tabs: [...state.tabs, newTab],
      activeTabId: newTab.id,
    };
  }
  return state;
};

// Create a reducer that handles both custom and base actions
export const openNeuroTabsReducer = createTabsReducer<
  OpenNeuroTab,
  OpenNeuroTabAction
>(customReducer);
