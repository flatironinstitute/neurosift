export type BaseTab = {
  id: string;
  label: string;
  type: string;
};

export type BaseTabsState<T extends BaseTab = BaseTab> = {
  tabs: T[];
  activeTabId: string;
};

export type BaseCloseTabAction = { type: "CLOSE_TAB"; id: string };
export type BaseSwitchTabAction = { type: "SWITCH_TO_TAB"; id: string };
export type BaseTabAction = BaseCloseTabAction | BaseSwitchTabAction;

// Helper function to check if an action is a base action
const isBaseAction = (action: { type: string }): action is BaseTabAction => {
  return action.type === "CLOSE_TAB" || action.type === "SWITCH_TO_TAB";
};

export const createTabsReducer = <
  T extends BaseTab,
  A extends { type: string },
>(
  customReducer?: (state: BaseTabsState<T>, action: A) => BaseTabsState<T>,
) => {
  return (
    state: BaseTabsState<T>,
    action: A | BaseTabAction,
  ): BaseTabsState<T> => {
    // First try custom reducer for non-base actions
    if (customReducer && !isBaseAction(action)) {
      const result = customReducer(state, action as A);
      if (result !== state) {
        return result;
      }
    }

    // Handle base actions
    if (isBaseAction(action)) {
      switch (action.type) {
        case "CLOSE_TAB": {
          const newTabs = state.tabs.filter((t) => t.id !== action.id);
          return {
            tabs: newTabs,
            activeTabId:
              action.id === state.activeTabId
                ? newTabs.length > 0
                  ? newTabs[newTabs.length - 1].id
                  : "main"
                : state.activeTabId,
          };
        }
        case "SWITCH_TO_TAB": {
          return {
            ...state,
            activeTabId: action.id,
          };
        }
      }
    }

    return state;
  };
};
