import React, { useState, useEffect, useCallback } from "react";
import { useNwbGroup, useNwbDataset, getNwbDatasetData } from "@nwbInterface";
import { DatasetDataType } from "@remote-h5-file";
import { SmallIconButton } from "@fi-sci/misc";
import { FaExternalLinkAlt } from "react-icons/fa";

type DatasetInfo = {
  dtype: string;
  shape: number[];
  data: DatasetDataType | null;
};

type TreeNodeProps = {
  name: string;
  path: string;
  nwbUrl: string;
  indent: number;
  type: "group" | "dataset";
  onOpenObjectInNewTab?: (path: string) => void;
};

const product = (shape: number[]): number => {
  return shape.reduce((acc, val) => acc * val, 1);
};

const TreeNode: React.FC<TreeNodeProps> = ({
  name,
  path,
  nwbUrl,
  indent,
  type,
  onOpenObjectInNewTab,
}) => {
  const [expanded, setExpanded] = useState(indent === 0);
  const [datasetInfo, setDatasetInfo] = useState<DatasetInfo | null>(null);
  const group = useNwbGroup(nwbUrl, type === "group" ? path : "");
  const dataset = useNwbDataset(nwbUrl, type === "dataset" ? path : "");

  const viewDatasetInConsole = useCallback(async () => {
    if (type === "dataset" && dataset) {
      console.info("Loading dataset data for " + path);
      const data = await getNwbDatasetData(nwbUrl, path, {});
      console.info(`Dataset data for ${path}:`);
      console.info(data);
    }
  }, [type, dataset, path, nwbUrl]);

  useEffect(() => {
    const loadDatasetInfo = async () => {
      if (type === "dataset" && expanded && dataset && !datasetInfo) {
        if (product(dataset.shape) <= 100) {
          try {
            const data = await getNwbDatasetData(nwbUrl, path, {});
            if (data !== undefined) {
              setDatasetInfo({
                dtype: dataset.dtype,
                shape: dataset.shape,
                data,
              });
            }
          } catch (error) {
            console.error("Error loading dataset:", error);
          }
        }
      }
    };
    loadDatasetInfo();
  }, [type, expanded, dataset, datasetInfo, nwbUrl, path]);

  const handleClick = () => {
    setExpanded(!expanded);
  };

  return (
    <div>
      <div
        onClick={handleClick}
        style={{
          paddingLeft: `${indent * 20}px`,
          cursor: "pointer",
          color: type === "group" ? "#57a" : "#5a7",
          marginBottom: "4px",
        }}
      >
        <span style={{ marginRight: "5px" }}>{expanded ? "▼" : "►"}</span>
        {name}
        {type === "dataset" && dataset && !expanded && (
          <span
            style={{ color: "#666", marginLeft: "10px", fontSize: "0.9em" }}
          >
            {`${dataset.dtype} ${JSON.stringify(dataset.shape)}`}
          </span>
        )}
        {type === "group" &&
          indent > 0 &&
          group?.attrs?.neurodata_type &&
          onOpenObjectInNewTab && (
            <span style={{ marginLeft: "5px" }}>
              <FaExternalLinkAlt
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenObjectInNewTab(path);
                }}
                title="View in new tab"
                style={{
                  cursor: "pointer",
                  fontSize: "0.7em",
                  color: "#666",
                  verticalAlign: "middle",
                }}
              />
            </span>
          )}
      </div>
      {expanded && (
        <div>
          {/* Show dataset info and data when expanded */}
          {type === "dataset" && dataset && (
            <div
              style={{
                paddingLeft: `${indent * 20 + 20}px`,
                marginBottom: "8px",
                fontSize: "0.9em",
                fontFamily: "monospace",
              }}
            >
              <div style={{ color: "#5a7", marginBottom: "4px" }}>
                {`${dataset.dtype} ${JSON.stringify(dataset.shape)}`}
                {!product(dataset.shape) && <span> (empty)</span>}
                {product(dataset.shape) > 100 && (
                  <span style={{ marginLeft: "10px" }}>
                    <SmallIconButton
                      onClick={() => {
                        void viewDatasetInConsole();
                      }}
                      title="View in debug console"
                      icon={<FaExternalLinkAlt style={{ fontSize: "0.9em" }} />}
                    />
                  </span>
                )}
              </div>
              <div>
                {datasetInfo?.data !== undefined && (
                  <div>VALUE: {JSON.stringify(datasetInfo.data, null, 2)}</div>
                )}
              </div>
            </div>
          )}

          {/* Show attributes when expanded */}
          {((type === "group" && group?.attrs) ||
            (type === "dataset" && dataset?.attrs)) && (
            <div
              style={{
                paddingLeft: `${indent * 20 + 20}px`,
                marginBottom: "8px",
                fontSize: "0.9em",
              }}
            >
              {Object.entries(
                type === "group" ? group!.attrs : dataset!.attrs,
              ).map(([key, value]) => (
                <div
                  key={key}
                  style={{
                    color: "#555",
                    marginBottom: "2px",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  {key}:{" "}
                  {typeof value === "object"
                    ? JSON.stringify(value)
                    : String(value)}
                </div>
              ))}
            </div>
          )}

          {/* Show subgroups and datasets for groups */}
          {type === "group" &&
            group &&
            group.subgroups.map((sg) => (
              <TreeNode
                key={sg.path}
                name={sg.name}
                path={sg.path}
                nwbUrl={nwbUrl}
                indent={indent + 1}
                type="group"
                onOpenObjectInNewTab={onOpenObjectInNewTab}
              />
            ))}
          {type === "group" &&
            group &&
            group.datasets.map((ds) => (
              <TreeNode
                key={ds.path}
                name={ds.name}
                path={ds.path}
                nwbUrl={nwbUrl}
                indent={indent + 1}
                type="dataset"
                onOpenObjectInNewTab={onOpenObjectInNewTab}
              />
            ))}
        </div>
      )}
    </div>
  );
};

type Props = {
  nwbUrl: string;
  path: string;
  objectType: "group" | "dataset";
  onOpenObjectInNewTab?: (path: string) => void;
};

const DefaultView: React.FC<Props> = ({
  nwbUrl,
  path,
  objectType,
  onOpenObjectInNewTab,
}) => {
  if (objectType === "dataset") {
    return (
      <DefaultDatasetView
        nwbUrl={nwbUrl}
        path={path}
        objectType={objectType}
        onOpenObjectInNewTab={onOpenObjectInNewTab}
      />
    );
  } else {
    return (
      <DefaultGroupView
        nwbUrl={nwbUrl}
        path={path}
        objectType={objectType}
        onOpenObjectInNewTab={onOpenObjectInNewTab}
      />
    );
  }
};

const DefaultGroupView: React.FC<Props> = ({
  nwbUrl,
  path,
  onOpenObjectInNewTab,
}) => {
  const group = useNwbGroup(nwbUrl, path);
  if (!group) return <>Loading group...</>;

  return (
    <div style={{ padding: "20px" }}>
      <TreeNode
        name={path.split("/").pop() || path}
        path={path}
        nwbUrl={nwbUrl}
        indent={0}
        type="group"
        onOpenObjectInNewTab={onOpenObjectInNewTab}
      />
    </div>
  );
};

const DefaultDatasetView: React.FC<Props> = ({
  nwbUrl,
  path,
  onOpenObjectInNewTab,
}) => {
  const dataset = useNwbDataset(nwbUrl, path);
  if (!dataset) return <>Loading dataset...</>;

  return (
    <div style={{ padding: "20px" }}>
      <TreeNode
        name={path.split("/").pop() || path}
        path={path}
        nwbUrl={nwbUrl}
        indent={0}
        type="dataset"
        onOpenObjectInNewTab={onOpenObjectInNewTab}
      />
    </div>
  );
};

export default DefaultView;
