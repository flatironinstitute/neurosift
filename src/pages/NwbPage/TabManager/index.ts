import { useEffect, useReducer } from "react";
import { determineObjectType } from "../ObjectTypeUtils";
import { NwbObjectViewPlugin } from "../plugins/pluginInterface";
import { findPluginByName } from "../plugins/registry";
import tabsReducer from "../tabsReducer";
import { TabsState } from "../TabTypes";

interface UseTabManagerProps {
  nwbUrl: string;
  initialTabId?: string;
}

interface UseTabManagerResult {
  tabsState: TabsState;
  handleOpenObject: (
    path: string,
    plugin?: NwbObjectViewPlugin,
    secondaryPaths?: string[],
  ) => Promise<void>;
  handleOpenObjects: (paths: string[]) => Promise<void>;
  handleClearSubView: () => void;
  handleSwitchTab: (id: string) => void;
}

export const useTabManager = ({
  nwbUrl,
  initialTabId,
}: UseTabManagerProps): UseTabManagerResult => {
  const [tabsState, dispatch] = useReducer(tabsReducer, {
    activeTabId: "neurodata",
    neurodataSubView: null,
  });

  useEffect(() => {
    let canceled = false;
    const load = async () => {
      if (initialTabId) {
        if (initialTabId.startsWith("view:")) {
          const a = initialTabId.split("|");
          if (a.length !== 2) {
            console.error("Invalid tab id", initialTabId);
            return;
          }
          const pluginName = a[0].substring("view:".length);
          const b = a[1].split("^");
          const path = b[0];
          const secondaryPaths = b.slice(1);
          const plugin = findPluginByName(pluginName);
          if (!plugin) {
            console.error("Plugin not found:", pluginName);
            return;
          }
          const objectType = await determineObjectType(nwbUrl, path);
          if (canceled) return;
          dispatch({
            type: "SET_SINGLE_SUBVIEW",
            path,
            objectType,
            plugin,
            secondaryPaths,
          });
        } else if (initialTabId.startsWith("[")) {
          const paths = JSON.parse(initialTabId);
          const objectTypes = await Promise.all(
            paths.map((path: string) => determineObjectType(nwbUrl, path)),
          );
          if (canceled) return;
          dispatch({ type: "SET_MULTI_SUBVIEW", paths, objectTypes });
        } else {
          const objectType = await determineObjectType(nwbUrl, initialTabId);
          if (canceled) return;
          dispatch({
            type: "SET_SINGLE_SUBVIEW",
            path: initialTabId,
            objectType,
          });
        }
      }
    };
    load();
    return () => {
      canceled = true;
    };
  }, [initialTabId, nwbUrl]);

  const handleOpenObject = async (
    path: string,
    plugin?: NwbObjectViewPlugin,
    secondaryPaths?: string[],
  ) => {
    const objectType = await determineObjectType(nwbUrl, path);
    dispatch({
      type: "SET_SINGLE_SUBVIEW",
      path,
      objectType,
      plugin,
      secondaryPaths,
    });
  };

  const handleOpenObjects = async (paths: string[]) => {
    if (paths.length === 1) {
      const objectType = await determineObjectType(nwbUrl, paths[0]);
      dispatch({
        type: "SET_SINGLE_SUBVIEW",
        path: paths[0],
        objectType,
      });
    } else {
      const objectTypes = await Promise.all(
        paths.map((path) => determineObjectType(nwbUrl, path)),
      );
      dispatch({ type: "SET_MULTI_SUBVIEW", paths, objectTypes });
    }
  };

  const handleClearSubView = () => {
    dispatch({ type: "CLEAR_SUBVIEW" });
  };

  const handleSwitchTab = (id: string) => {
    dispatch({ type: "SWITCH_TO_TAB", id });
  };

  return {
    tabsState,
    handleOpenObject,
    handleOpenObjects,
    handleClearSubView,
    handleSwitchTab,
  };
};
