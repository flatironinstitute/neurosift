import { useEffect, useReducer } from "react";
import { determineObjectType } from "../ObjectTypeUtils";
import { NwbObjectViewPlugin } from "../plugins/pluginInterface";
import { findPluginByName } from "../plugins/registry";
import tabsReducer from "../tabsReducer";
import { parseMultiTabItem } from "../multiTabItems";
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
    activeTabId: "widgets",
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
          const items: string[] = JSON.parse(initialTabId);
          const objectTypes = await Promise.all(
            items.map((item) =>
              determineObjectType(nwbUrl, parseMultiTabItem(item).path),
            ),
          );
          if (canceled) return;
          dispatch({ type: "OPEN_MULTI_TAB", paths: items, objectTypes });
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

  // Items are the strings collected by the hierarchy view: plain paths or
  // "plugin|path^secondary" entries. Object types are resolved for the path
  // inside each item, not for the raw string.
  const handleOpenObjectsInNewTab = async (items: string[]) => {
    if (items.length === 1) {
      const path = parseMultiTabItem(items[0]).path;
      const objectType = await determineObjectType(nwbUrl, path);
      dispatch({ type: "OPEN_TAB", id: path, path, objectType });
    } else {
      const objectTypes = await Promise.all(
        items.map((item) =>
          determineObjectType(nwbUrl, parseMultiTabItem(item).path),
        ),
      );
      dispatch({ type: "OPEN_MULTI_TAB", paths: items, objectTypes });
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
