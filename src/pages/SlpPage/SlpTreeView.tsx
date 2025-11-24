/* eslint-disable @typescript-eslint/no-explicit-any */
import { FunctionComponent, useMemo } from "react";
import SlpTreeNode from "./SlpTreeNode";
import "./SlpTreeView.css";

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

type Tree = {
  groups: { [path: string]: Group };
  datasets: { [path: string]: Dataset };
  expandedGroups: { [path: string]: boolean };
};

type Props = {
  tree: Tree;
  onExpandGroup: (groupPath: string) => void;
  onCollapseGroup: (groupPath: string) => void;
};

const SlpTreeView: FunctionComponent<Props> = ({
  tree,
  onExpandGroup,
  onCollapseGroup,
}) => {
  const visibleRows = useMemo(() => {
    const rows: Array<{
      path: string;
      name: string;
      type: "group" | "dataset";
      depth: number;
      group?: Group;
      dataset?: Dataset;
    }> = [];

    const processGroup = (groupPath: string, depth: number) => {
      const group = tree.groups[groupPath];
      if (!group) return;

      // Get the name from the path
      const pathParts = groupPath.split("/").filter((p) => p !== "");
      const name =
        pathParts.length === 0 ? "/" : pathParts[pathParts.length - 1];

      // Add the group itself
      rows.push({
        path: groupPath,
        name: name,
        type: "group",
        depth: depth,
        group: group,
      });

      // If expanded, add children
      if (tree.expandedGroups[groupPath]) {
        // Add subgroups
        for (const sg of group.subgroups) {
          processGroup(sg.path, depth + 1);
        }

        // Add datasets
        for (const ds of group.subdatasets) {
          const dataset = tree.datasets[ds.path];
          if (dataset) {
            const dsPathParts = ds.path.split("/").filter((p) => p !== "");
            const dsName = dsPathParts[dsPathParts.length - 1];
            rows.push({
              path: ds.path,
              name: dsName,
              type: "dataset",
              depth: depth + 1,
              dataset: dataset,
            });
          }
        }
      }
    };

    // Start from root
    processGroup("/", 0);

    return rows;
  }, [tree]);

  const handleToggleExpand = (path: string) => {
    if (tree.expandedGroups[path]) {
      onCollapseGroup(path);
    } else {
      onExpandGroup(path);
    }
  };

  return (
    <div style={{ width: "100%", height: "100%", overflowY: "auto" }}>
      <table className="slp-tree-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Attributes</th>
          </tr>
        </thead>
        <tbody>
          {visibleRows.map((row) => (
            <SlpTreeNode
              key={row.path}
              path={row.path}
              name={row.name}
              type={row.type}
              depth={row.depth}
              group={row.group}
              dataset={row.dataset}
              isExpanded={!!tree.expandedGroups[row.path]}
              onToggleExpand={() => handleToggleExpand(row.path)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SlpTreeView;
