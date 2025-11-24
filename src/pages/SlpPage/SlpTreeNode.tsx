/* eslint-disable @typescript-eslint/no-explicit-any */
import { FunctionComponent } from "react";
import AttributesDisplay from "./AttributesDisplay";

// Helper to format dtype for display
const formatDtype = (dtype: any): string => {
  if (typeof dtype === "string") {
    return dtype;
  }
  if (typeof dtype === "object" && dtype !== null) {
    if (dtype.compound_type !== undefined) {
      return `compound(${dtype.compound_type})`;
    }
    return JSON.stringify(dtype);
  }
  return String(dtype);
};

type Group = {
  attrs: { [key: string]: any };
  subdatasets: { name: string; path: string }[];
  subgroups: { name: string; path: string }[];
  path: string;
};

type Dataset = {
  attrs: { [key: string]: any };
  dtype: string;
  shape: number[];
  name: string;
  path: string;
};

type Props = {
  path: string;
  name: string;
  type: "group" | "dataset";
  depth: number;
  group?: Group;
  dataset?: Dataset;
  isExpanded: boolean;
  onToggleExpand: () => void;
};

const SlpTreeNode: FunctionComponent<Props> = ({
  path,
  name,
  type,
  depth,
  group,
  dataset,
  isExpanded,
  onToggleExpand,
}) => {
  const indentation = Math.max(0, depth * 12);
  const hasChildren =
    type === "group" &&
    group &&
    (group.subgroups.length > 0 || group.subdatasets.length > 0);

  const displayName = path === "/" ? "/" : name;
  const dtypeStr =
    type === "dataset" && dataset?.dtype ? formatDtype(dataset.dtype) : null;
  const shapeStr =
    type === "dataset" && dataset?.shape
      ? `[${dataset.shape.join(", ")}]`
      : null;

  return (
    <tr>
      <td>
        <div
          className="slp-tree-node-content"
          style={{ marginLeft: indentation }}
        >
          {hasChildren ? (
            <span className="slp-tree-expand-control" onClick={onToggleExpand}>
              {isExpanded ? "▼" : "►"}
            </span>
          ) : (
            <span style={{ width: "16px", display: "inline-block" }}></span>
          )}

          {type === "group" ? (
            <span className="slp-tree-group-icon">📁</span>
          ) : (
            <span className="slp-tree-dataset-icon">▪️</span>
          )}

          <span className={`slp-tree-node-name ${type}`}>
            {displayName}
            {shapeStr && (
              <span
                style={{
                  color: "#666",
                  fontWeight: "normal",
                  marginLeft: "4px",
                  fontFamily: "monospace",
                  fontSize: "0.85em",
                }}
              >
                {shapeStr}
              </span>
            )}
            {dtypeStr && (
              <span
                style={{
                  color: "#888",
                  fontWeight: "normal",
                  marginLeft: "4px",
                  fontSize: "0.9em",
                }}
              >
                ({dtypeStr})
              </span>
            )}
          </span>
        </div>
      </td>
      <td>
        {type === "group" && group && <AttributesDisplay attrs={group.attrs} />}
        {type === "dataset" && dataset && (
          <AttributesDisplay attrs={dataset.attrs} />
        )}
      </td>
    </tr>
  );
};

export default SlpTreeNode;
