import { NwbObjectViewPlugin } from "./plugins/pluginInterface";
import { findPluginByName } from "./plugins/registry";
import { TabsState, TabsAction } from "./TabTypes";

const tabsReducer = (state: TabsState, action: TabsAction): TabsState => {
  switch (action.type) {
    case "SET_SINGLE_SUBVIEW": {
      return {
        activeTabId: "neurodata",
        neurodataSubView: {
          type: "single",
          path: action.path,
          objectType: action.objectType,
          plugin: action.plugin,
          secondaryPaths: action.secondaryPaths,
        },
      };
    }

    case "SET_MULTI_SUBVIEW": {
      if (!action.paths.length) return state;

      const { paths, plugins, secondaryPathsList } = getPathsAndPlugins(
        action.paths,
      );

      return {
        activeTabId: "neurodata",
        neurodataSubView: {
          type: "multi",
          paths,
          objectTypes: action.objectTypes,
          plugins,
          secondaryPathsList,
        },
      };
    }

    case "CLEAR_SUBVIEW": {
      return {
        ...state,
        neurodataSubView: null,
      };
    }

    case "SWITCH_TO_TAB": {
      return {
        ...state,
        activeTabId: action.id,
      };
    }

    default:
      return state;
  }
};

const getPathsAndPlugins = (itemStrings: string[]) => {
  const paths: string[] = [];
  const plugins: (NwbObjectViewPlugin | undefined)[] = [];
  const secondaryPathsList: (string[] | undefined)[] = [];
  for (const itemString of itemStrings) {
    const a = itemString.split("|");
    if (a.length <= 1) {
      paths.push(itemString);
      plugins.push(undefined);
    } else {
      const b = a[1].split("^");
      paths.push(b[0]);
      const s = b.slice(1);
      const p = findPluginByName(a[0]);
      plugins.push(p);
      secondaryPathsList.push(s);
    }
  }
  return { paths, plugins, secondaryPathsList };
};

export default tabsReducer;
