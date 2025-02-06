import { useCallback, useEffect, useMemo, useReducer } from "react";
import { getNwbGroup, NwbGroup } from "./nwbInterface";

type NeurodataObject = {
  path: string;
  group: NwbGroup;
  parent: NeurodataObject | null;
  expanded: boolean;
  expanding: boolean;
};

type NeurodataObjectsState = {
  objects: NeurodataObject[];
};

export const initialNeurodataObjectsState: NeurodataObjectsState = {
  objects: [],
};

type NeurodataObjectsAction =
  | {
      type: "addObject";
      path: string;
      group: NwbGroup;
      parentPath: string | null;
    }
  | {
      type: "setObjectExpanded";
      path: string;
      expanded: boolean;
    }
  | {
      type: "setObjectExpanding";
      path: string;
      expanding: boolean;
    }
  | {
      type: "clear";
    };

export const neurodataObjectsReducer = (
  state: NeurodataObjectsState,
  action: NeurodataObjectsAction,
): NeurodataObjectsState => {
  switch (action.type) {
    case "addObject": {
      const existing = state.objects.find((o) => o.path === action.path);
      if (existing) return state;
      const parent = action.parentPath
        ? state.objects.find((o) => o.path === action.parentPath) || null
        : null;
      const obj: NeurodataObject = {
        path: action.path,
        group: action.group,
        parent,
        expanded: false,
        expanding: false,
      };
      return {
        objects: [...state.objects, obj],
      };
    }
    case "setObjectExpanded": {
      return {
        objects: state.objects.map((o) =>
          o.path === action.path ? { ...o, expanded: action.expanded } : o,
        ),
      };
    }
    case "setObjectExpanding": {
      return {
        objects: state.objects.map((o) =>
          o.path === action.path ? { ...o, expanding: action.expanding } : o,
        ),
      };
    }
    case "clear": {
      return initialNeurodataObjectsState;
    }
    default:
      return state;
  }
};

/**
 * A React hook that manages a hierarchical tree of NWB (Neurodata Without Borders) objects.
 *
 * This hook handles the loading and state management of neurodata objects from an NWB file.
 * A neurodata object is an HDF5 group that contains the 'neurodata_type' attribute.
 * The hook maintains an expandable tree structure where:
 * - Each object can be expanded to reveal its child neurodata objects
 * - Only groups with 'neurodata_type' attribute are included in the tree
 * - Non-neurodata groups are traversed but not included in the tree
 *
 * @param nwbUrl - URL of the NWB file to load
 * @returns {Object}
 *   - neurodataObjects: Current state containing the tree of neurodata objects
 *   - expandItem: Function to expand a neurodata object and load its children
 */
export const useNeurodataObjects = (nwbUrl: string) => {
  const [neurodataObjects, dispatch] = useReducer(
    neurodataObjectsReducer,
    initialNeurodataObjectsState,
  );

  // initialize root object
  useEffect(() => {
    const addRootObject = async () => {
      const group = await getNwbGroup(nwbUrl, "/");
      if (group) {
        dispatch({ type: "addObject", path: "/", group, parentPath: null });
      }
    };
    dispatch({ type: "clear" });
    addRootObject();
  }, [nwbUrl]);

  const expandItem = useCallback(
    async (path: string) => {
      const obj = neurodataObjects.objects.find((o) => o.path === path);
      if (!obj) return;
      if (obj.expanded || obj.expanding) return;
      dispatch({ type: "setObjectExpanding", path, expanding: true });

      const expandGroup = async (
        group: NwbGroup,
        neurodataParentPath: string,
      ) => {
        for (const sg of group.subgroups) {
          if (sg.attrs["neurodata_type"]) {
            const grp = await getNwbGroup(nwbUrl, sg.path);
            if (grp) {
              dispatch({
                type: "addObject",
                path: sg.path,
                group: grp,
                parentPath: neurodataParentPath,
              });
            }
          } else {
            const grp = await getNwbGroup(nwbUrl, sg.path);
            if (grp) {
              await expandGroup(grp, neurodataParentPath);
            }
          }
        }
      };

      await expandGroup(obj.group, obj.path);
      dispatch({ type: "setObjectExpanding", path, expanding: false });
      dispatch({ type: "setObjectExpanded", path, expanded: true });
    },
    [nwbUrl, neurodataObjects],
  );

  // auto-expand root when it's added
  useEffect(() => {
    const rootObj = neurodataObjects.objects.find((o) => o.path === "/");
    if (rootObj && !rootObj.expanded && !rootObj.expanding) {
      expandItem("/");
    }
  }, [neurodataObjects, expandItem]);

  const loading = useMemo(() => {
    let loading = false;
    neurodataObjects.objects.forEach((o) => {
      if (o.expanding) loading = true;
    });
    return loading;
  }, [neurodataObjects]);

  return {
    neurodataObjects,
    expandItem,
    loading,
  };
};
