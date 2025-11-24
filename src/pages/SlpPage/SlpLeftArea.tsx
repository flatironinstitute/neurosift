/* eslint-disable @typescript-eslint/no-explicit-any */
import { getHdf5Dataset, getHdf5Group } from "@hdf5Interface";
import { FunctionComponent, useEffect, useReducer } from "react";
import SlpTreeView from "./SlpTreeView";

type Props = {
  slpUrl: string;
  width: number;
  height: number;
};

type Subdataset = {
  attrs: { [key: string]: any };
  dtype: string;
  shape: number[];
  name: string;
  path: string;
};

type Subgroup = {
  attrs: { [key: string]: any };
  name: string;
  path: string;
};

type Group = {
  attrs: { [key: string]: any };
  subdatasets: Subdataset[];
  subgroups: Subgroup[];
  slpUrl: string;
  path: string;
};

type Dataset = {
  attrs: { [key: string]: any };
  dtype: string;
  shape: number[];
  name: string;
  path: string;
  slpUrl: string;
};

const getGroup = async (slpUrl: string, path: string) => {
  const g = await getHdf5Group(slpUrl, path);
  if (!g) return undefined;
  const ret: Group = {
    attrs: g.attrs,
    subdatasets: [],
    subgroups: [],
    slpUrl: slpUrl,
    path: path,
  };
  for (const ds of g.datasets) {
    ret.subdatasets.push({
      attrs: ds.attrs,
      dtype: ds.dtype,
      shape: ds.shape,
      name: ds.name,
      path: ds.path,
    });
  }
  for (const sg of g.subgroups) {
    ret.subgroups.push({
      attrs: sg.attrs,
      name: sg.name,
      path: sg.path,
    });
  }
  return ret;
};

const getDataset = async (slpUrl: string, path: string) => {
  const d = await getHdf5Dataset(slpUrl, path);
  if (!d) return undefined;
  const ret: Dataset = {
    attrs: d.attrs,
    dtype: d.dtype,
    shape: d.shape,
    name: d.name,
    path: d.path,
    slpUrl: slpUrl,
  };
  return ret;
};

type Tree = {
  groups: { [path: string]: Group };
  datasets: { [path: string]: Dataset };
  expandedGroups: { [path: string]: boolean };
};

type TreeAction =
  | {
      type: "set_group";
      group: Group;
    }
  | {
      type: "set_dataset";
      dataset: Dataset;
    }
  | {
      type: "set_group_expanded";
      groupPath: string;
      expanded: boolean;
    };

const emptyTree: Tree = {
  groups: {},
  datasets: {},
  expandedGroups: { "/": true }, // Root starts expanded
};

const treeReducer = (state: Tree, action: TreeAction): Tree => {
  switch (action.type) {
    case "set_group": {
      const newGroups = { ...state.groups };
      newGroups[action.group.path] = action.group;
      return { ...state, groups: newGroups };
    }
    case "set_dataset": {
      const newDatasets = { ...state.datasets };
      newDatasets[action.dataset.path] = action.dataset;
      return { ...state, datasets: newDatasets };
    }
    case "set_group_expanded": {
      const newExpandedGroups = { ...state.expandedGroups };
      newExpandedGroups[action.groupPath] = action.expanded;
      return { ...state, expandedGroups: newExpandedGroups };
    }
    default:
      return state;
  }
};

const useTree = (slpUrl: string) => {
  const [tree, treeDispatch] = useReducer(treeReducer, emptyTree);
  useEffect(() => {
    const fetchRootGroup = async () => {
      const rg = await getGroup(slpUrl, "/");
      if (rg) {
        treeDispatch({ type: "set_group", group: rg });
        // Root is already expanded, so fetch its children
        for (const sg_info of rg.subgroups) {
          const sg = await getGroup(slpUrl, sg_info.path);
          if (sg) {
            treeDispatch({ type: "set_group", group: sg });
          }
        }
        for (const ds_info of rg.subdatasets) {
          const ds = await getDataset(slpUrl, ds_info.path);
          if (ds) {
            treeDispatch({ type: "set_dataset", dataset: ds });
          }
        }
      }
    };
    fetchRootGroup();
  }, [slpUrl]);

  const expandGroup = async (groupPath: string) => {
    const grp = tree.groups[groupPath];
    if (!grp) return;

    // Set expanded first for better UX
    treeDispatch({
      type: "set_group_expanded",
      groupPath: groupPath,
      expanded: true,
    });

    // Then fetch children
    for (const sg_info of grp.subgroups) {
      const sg = await getGroup(slpUrl, sg_info.path);
      if (sg) {
        treeDispatch({ type: "set_group", group: sg });
      }
    }
    for (const ds_info of grp.subdatasets) {
      const ds = await getDataset(slpUrl, ds_info.path);
      if (ds) {
        treeDispatch({ type: "set_dataset", dataset: ds });
      }
    }
  };

  const collapseGroup = (groupPath: string) => {
    treeDispatch({
      type: "set_group_expanded",
      groupPath: groupPath,
      expanded: false,
    });
  };

  return { tree, expandGroup, collapseGroup };
};

const SlpLeftArea: FunctionComponent<Props> = ({ slpUrl, width, height }) => {
  const { tree, expandGroup, collapseGroup } = useTree(slpUrl);

  return (
    <div style={{ width, height, overflow: "hidden" }}>
      <SlpTreeView
        tree={tree}
        onExpandGroup={expandGroup}
        onCollapseGroup={collapseGroup}
      />
    </div>
  );
};

export default SlpLeftArea;
