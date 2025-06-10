import React from "react";
import { useHdf5Group } from "@hdf5Interface";

type Props = {
  nwbUrl: string;
  path: string;
  objectType: "group" | "dataset";
  onOpenObjectInNewTab?: (path: string) => void;
  width?: number;
  height?: number;
};

const IntracellularRecordingsTableView: React.FC<Props> = ({
  nwbUrl,
  path,
  width = 500,
  height = 400,
}) => {
  const group = useHdf5Group(nwbUrl, path);

  if (!group) {
    return <div>Loading IntracellularRecordingsTable...</div>;
  }

  return (
    <div
      style={{
        width,
        height,
        padding: "10px",
        overflow: "auto",
        fontFamily: "monospace",
        fontSize: "14px",
      }}
    >
      <h3 style={{ margin: "0 0 15px 0", color: "#333" }}>
        IntracellularRecordingsTable
      </h3>

      <div style={{ marginBottom: "15px" }}>
        <strong>Path:</strong> {path}
      </div>

      <div style={{ marginBottom: "15px" }}>
        <strong>Attributes:</strong>
      </div>

      <div
        style={{
          backgroundColor: "#f5f5f5",
          padding: "10px",
          borderRadius: "4px",
          border: "1px solid #ddd",
        }}
      >
        {Object.keys(group.attrs).length === 0 ? (
          <div style={{ color: "#666", fontStyle: "italic" }}>
            No attributes found
          </div>
        ) : (
          Object.entries(group.attrs).map(([key, value]) => (
            <div
              key={key}
              style={{
                marginBottom: "8px",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div style={{ fontWeight: "bold", color: "#555" }}>{key}:</div>
              <div
                style={{
                  marginLeft: "10px",
                  color: "#333",
                  wordBreak: "break-word",
                }}
              >
                {typeof value === "object"
                  ? JSON.stringify(value, null, 2)
                  : String(value)}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Show basic structure info */}
      <div style={{ marginTop: "20px" }}>
        <strong>Structure:</strong>
      </div>
      <div
        style={{
          backgroundColor: "#f9f9f9",
          padding: "10px",
          borderRadius: "4px",
          border: "1px solid #ddd",
          marginTop: "5px",
        }}
      >
        <div>Subgroups: {group.subgroups.length}</div>
        <div>Datasets: {group.datasets.length}</div>

        {group.subgroups.length > 0 && (
          <div style={{ marginTop: "10px" }}>
            <div style={{ fontWeight: "bold" }}>Subgroups:</div>
            {group.subgroups.map((sg) => (
              <div key={sg.path} style={{ marginLeft: "10px" }}>
                • {sg.name}
              </div>
            ))}
          </div>
        )}

        {group.datasets.length > 0 && (
          <div style={{ marginTop: "10px" }}>
            <div style={{ fontWeight: "bold" }}>Datasets:</div>
            {group.datasets.map((ds) => (
              <div key={ds.path} style={{ marginLeft: "10px" }}>
                • {ds.name} ({ds.dtype}, shape: {JSON.stringify(ds.shape)})
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default IntracellularRecordingsTableView;
