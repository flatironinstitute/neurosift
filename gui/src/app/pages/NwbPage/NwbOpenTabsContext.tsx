import React, { FunctionComponent, PropsWithChildren, useEffect } from "react";

type NwbOpenTabsState = {
  openTabs: {
    tabName: string;
  }[];
  currentTabName?: string;
  initialTimeSelections: {
    [tabName: string]: {
      t0?: number;
      t1?: number;
      t2?: number;
    };
  };
  initialStateStrings?: {
    [tabName: string]: string;
  };
};

type NwbOpenTabsAction =
  | {
      type: "openTab";
      tabName: string;
      t1?: number;
      t2?: number;
      t0?: number;
      stateString?: string;
    }
  | {
      type: "closeTab";
      tabName: string;
    }
  | {
      type: "closeAllTabs";
    }
  | {
      type: "setCurrentTab";
      tabName: string;
    };

const nwbOpenTabsReducer = (
  state: NwbOpenTabsState,
  action: NwbOpenTabsAction,
): NwbOpenTabsState => {
  switch (action.type) {
    case "openTab":
      if (state.openTabs.find((x) => x.tabName === action.tabName)) {
        return {
          ...state,
          currentTabName: action.tabName,
        };
      }
      return {
        ...state,
        openTabs: [...state.openTabs, { tabName: action.tabName }],
        currentTabName: action.tabName,
        initialTimeSelections: {
          ...state.initialTimeSelections,
          [action.tabName]: {
            t1: action.t1,
            t2: action.t2,
            t0: action.t0,
          },
        },
        initialStateStrings: action.stateString
          ? {
              ...state.initialStateStrings,
              [action.tabName]: action.stateString,
            }
          : state.initialStateStrings,
      };
    case "closeTab":
      if (!state.openTabs.find((x) => x.tabName === action.tabName)) {
        return state;
      }
      return {
        ...state,
        openTabs: state.openTabs.filter((x) => x.tabName !== action.tabName),
        currentTabName:
          state.currentTabName === action.tabName
            ? state.openTabs[0]?.tabName
            : state.currentTabName,
      };
    case "closeAllTabs":
      return {
        ...state,
        openTabs: [],
        currentTabName: undefined,
      };
    case "setCurrentTab":
      if (!state.openTabs.find((x) => x.tabName === action.tabName)) {
        return state;
      }
      return {
        ...state,
        currentTabName: action.tabName,
      };
  }
};

type NwbOpenTabsContextType = {
  openTabs: {
    tabName: string;
  }[];
  currentTabName?: string;
  initialTimeSelections: {
    [tabName: string]: {
      t0?: number;
      t1?: number;
      t2?: number;
    };
  };
  initialStateStrings?: {
    [tabName: string]: string;
  };
  openTab: (tabName: string) => void;
  closeTab: (tabName: string) => void;
  closeAllTabs: () => void;
  setCurrentTab: (tabName: string) => void;
};

const NwbOpenTabsContext = React.createContext<NwbOpenTabsContextType>({
  openTabs: [],
  currentTabName: undefined,
  initialTimeSelections: {},
  initialStateStrings: {},
  openTab: () => {},
  closeTab: () => {},
  closeAllTabs: () => {},
  setCurrentTab: () => {},
});

type Props = {
  // none
};

const locationUrl = window.location.href;
const queryParamsString = locationUrl.split("?")[1];
const queryParams = new URLSearchParams(queryParamsString);
const test1Mode = queryParams.get("test1") === "1";

const defaultNwbOpenTabsState: NwbOpenTabsState = {
  openTabs: test1Mode
    ? [{ tabName: "main" }, { tabName: `timeseries-alignment` }]
    : [{ tabName: "main" }],
  currentTabName: test1Mode ? "timeseries-alignment" : "main",
  initialTimeSelections: {},
  initialStateStrings: {},
};

const urlQueryParams = new URLSearchParams(window.location.search);

export const SetupNwbOpenTabs: FunctionComponent<PropsWithChildren<Props>> = ({
  children,
}) => {
  const [openTabs, openTabsDispatch] = React.useReducer(
    nwbOpenTabsReducer,
    defaultNwbOpenTabsState,
  );

  const value: NwbOpenTabsContextType = React.useMemo(
    () => ({
      openTabs: openTabs.openTabs,
      currentTabName: openTabs.currentTabName,
      initialTimeSelections: openTabs.initialTimeSelections,
      initialStateStrings: openTabs.initialStateStrings,
      openTab: (tabName: string) =>
        openTabsDispatch({ type: "openTab", tabName }),
      closeTab: (tabName: string) =>
        openTabsDispatch({ type: "closeTab", tabName }),
      closeAllTabs: () => openTabsDispatch({ type: "closeAllTabs" }),
      setCurrentTab: (tabName: string) =>
        openTabsDispatch({ type: "setCurrentTab", tabName }),
    }),
    [openTabs],
  );

  useEffect(() => {
    const tab = urlQueryParams.get("tab");
    if (tab) {
      let t1: number | undefined = undefined;
      let t2: number | undefined = undefined;
      let t0: number | undefined = undefined;
      const tabTime = urlQueryParams.get("tab-time");
      if (tabTime) {
        const a = tabTime.split(",");
        if (a.length === 3) {
          t1 = Number(a[0]);
          t2 = Number(a[1]);
          t0 = a[2] === "undefined" ? undefined : Number(a[2]);
        }
      }
      const tabStateString = urlQueryParams.get("tab-state") || undefined;
      openTabsDispatch({
        type: "openTab",
        tabName: tab,
        t1,
        t2,
        t0,
        stateString: tabStateString,
      });
    }
  }, []);

  return (
    <NwbOpenTabsContext.Provider value={value}>
      {children}
    </NwbOpenTabsContext.Provider>
  );
};

export const useNwbOpenTabs = () => {
  const context = React.useContext(NwbOpenTabsContext);
  return context;
};
