import { useEffect, useReducer } from "react";
import { determineObjectType } from "../ObjectTypeUtils";
import { NwbObjectViewPlugin } from "../plugins/pluginInterface";
import { findPluginByName } from "../plugins/registry";
import tabsReducer from "../tabsReducer";
import { TabsState } from "../Types";

interface UseTabManagerProps {
  nwbUrl: string;
  initialTabId?: string;
}

interface UseTabManagerResult {
  tabsState: TabsState;
  handleOpenObjectsInNewTab: (paths: string[]) => Promise<void>;
  handleOpenObjectInNewTab: (
    path: string,
    plugin?: NwbObjectViewPlugin,
    secondaryPaths?: string[],
  ) => Promise<void>;
  handleCloseTab: (id: string, event: React.MouseEvent) => void;
  handleSwitchTab: (id: string) => void;
}

export const useTabManager = ({
  nwbUrl,
  initialTabId,
}: UseTabManagerProps): UseTabManagerResult => {
  const [tabsState, dispatch] = useReducer(tabsReducer, {
    tabs: [],
    activeTabId: "main",
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
            type: "OPEN_TAB",
            id: initialTabId,
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
          dispatch({ type: "OPEN_MULTI_TAB", paths, objectTypes });
        } else {
          const objectType = await determineObjectType(nwbUrl, initialTabId);
          if (canceled) return;
          dispatch({
            type: "OPEN_TAB",
            id: initialTabId,
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

  const handleOpenObjectsInNewTab = async (paths: string[]) => {
    if (paths.length === 1) {
      const objectType = await determineObjectType(nwbUrl, paths[0]);
      dispatch({ type: "OPEN_TAB", id: paths[0], path: paths[0], objectType });
    } else {
      const objectTypes = await Promise.all(
        paths.map((path) => determineObjectType(nwbUrl, path)),
      );
      dispatch({ type: "OPEN_MULTI_TAB", paths, objectTypes });
    }
  };

  const handleOpenObjectInNewTab = async (
    path: string,
    plugin?: NwbObjectViewPlugin,
    secondaryPaths?: string[],
  ) => {
    let id: string;
    if (secondaryPaths) {
      id = [path, ...secondaryPaths].join("^");
    } else {
      id = path;
    }
    if (plugin) {
      id = `view:${plugin.name}|${id}`;
    }
    const objectType = await determineObjectType(nwbUrl, path);
    dispatch({
      type: "OPEN_TAB",
      id,
      path,
      objectType,
      plugin,
      secondaryPaths,
    });
  };

  const handleCloseTab = (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    dispatch({ type: "CLOSE_TAB", id });
  };

  const handleSwitchTab = (id: string) => {
    dispatch({ type: "SWITCH_TO_TAB", id });
  };

  return {
    tabsState,
    handleOpenObjectsInNewTab,
    handleOpenObjectInNewTab,
    handleCloseTab,
    handleSwitchTab,
  };
};
