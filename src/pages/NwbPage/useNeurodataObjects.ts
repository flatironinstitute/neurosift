/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import {
  getNwbDataset,
  getNwbGroup,
  NwbDataset,
  NwbGroup,
} from "./nwbInterface";

export type NeurodataObject = {
  path: string;
  group?: NwbGroup;
  dataset?: NwbDataset;
  attrs: { [key: string]: any };
  parent: NeurodataObject | null;
  children: NeurodataObject[];
};

type GroupTreeNode = {
  group: NwbGroup;
};

export const useNeurodataObjects = (nwbUrl: string) => {
  const [neurodataObjects, setNeurodataObjects] = useState<NeurodataObject[]>(
    [],
  );
  const [loading, setLoading] = useState<boolean>(false);

  // update all the neurodata objects in a breadth-first manner
  useEffect(() => {
    let canceled = false;
    const groupTree: GroupTreeNode[] = [];
    const datasetsTree: NwbDataset[] = [];
    const updateNeurodataObjects = () => {
      const objects: NeurodataObject[] = [];
      const expandGroup = (group: NwbGroup, parent: NeurodataObject | null) => {
        for (const sg of group.subgroups) {
          const grp = groupTree.find((node) => node.group.path === sg.path);
          if (!grp) continue;
          const hasALotOfChildren =
            grp.group.subgroups.length >= 10 || grp.group.datasets.length >= 10;
          if (sg.attrs["neurodata_type"] || hasALotOfChildren) {
            const newObj: NeurodataObject = {
              path: sg.path,
              group: grp.group,
              attrs: grp.group.attrs,
              parent: parent,
              children: [],
            };
            objects.push(newObj);
            if (parent) parent.children.push(newObj);
            expandGroup(grp.group, newObj);
          } else {
            expandGroup(grp.group, parent);
          }
        }
        for (const sds of group.datasets) {
          if (sds.attrs["neurodata_type"]) {
            const ds = datasetsTree.find((ds) => ds.path === sds.path);
            if (!ds) continue;
            const newObj: NeurodataObject = {
              path: ds.path,
              dataset: ds,
              attrs: ds.attrs,
              parent: parent,
              children: [],
            };
            objects.push(newObj);
            if (parent) parent.children.push(newObj);
          }
        }
      };
      const rootGroup = groupTree.find((node) => node.group.path === "/");
      if (!rootGroup) return;
      objects.push({
        path: "/",
        group: rootGroup.group,
        attrs: rootGroup.group.attrs,
        parent: null,
        children: [],
      });
      expandGroup(rootGroup.group, objects[0]);
      setNeurodataObjects(objects);
    };
    (async () => {
      setLoading(true);
      // add root group
      const rootGroup = await getNwbGroup(nwbUrl, "/");
      if (!rootGroup) {
        console.error("Root group not found");
        return;
      }
      const groupTreeRootNode = {
        group: rootGroup,
        expanding: false,
        expanded: false,
      };
      groupTree.push(groupTreeRootNode);
      const queue: GroupTreeNode[] = [groupTreeRootNode];
      let timer = Date.now();
      while (queue.length > 0) {
        if (canceled) return;
        const node = queue.shift();
        if (!node) continue;
        const group = node.group;
        for (const sg of group.subgroups) {
          const grp = await getNwbGroup(nwbUrl, sg.path);
          if (canceled) return;
          if (!grp) continue;
          const newNode: GroupTreeNode = { group: grp };
          groupTree.push(newNode);
          queue.push(newNode);
        }
        for (const sds of group.datasets) {
          const ds = await getNwbDataset(nwbUrl, sds.path);
          if (canceled) return;
          if (!ds) continue;
          datasetsTree.push(ds);
        }
        const elapsed = Date.now() - timer;
        if (elapsed > 100) {
          updateNeurodataObjects();
          timer = Date.now();
        }
      }
      updateNeurodataObjects();
      setLoading(false);
    })();

    return () => {
      canceled = true;
    };
  }, [nwbUrl]);

  return {
    neurodataObjects,
    loading,
  };
};
