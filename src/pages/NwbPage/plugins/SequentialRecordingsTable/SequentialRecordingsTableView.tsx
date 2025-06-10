import React from "react";
import { useHdf5Group } from "@hdf5Interface";
import SequentialRecordingsPlotly from "./SequentialRecordingsPlotly";
import { useTimeseriesSelection } from "@shared/context-timeseries-selection-2";

type Props = {
    nwbUrl: string;
    path: string;
    width?: number;
    height?: number;
    objectType?: "group" | "dataset";
    onOpenObjectInNewTab?: (path: string) => void;
};

const SequentialRecordingsTableView: React.FC<Props> = ({
    nwbUrl,
    path,
    width = 1200,
    height = 800,
}) => {
    const group = useHdf5Group(nwbUrl, path);
    const { visibleStartTimeSec, visibleEndTimeSec } = useTimeseriesSelection();

    if (!group) {
        return <div>Loading SequentialRecordingsTable...</div>;
    }

    // Create time range object for the visualization
    const timeRange =
        visibleStartTimeSec !== undefined && visibleEndTimeSec !== undefined
            ? {
                start: visibleStartTimeSec,
                duration: visibleEndTimeSec - visibleStartTimeSec,
            }
            : undefined;

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
                Sequential Recordings Table
            </h3>

            <div style={{ marginBottom: "15px" }}>
                <strong>Path:</strong> {path}
            </div>

            {/* Description/Instructions */}
            <div
                style={{
                    marginBottom: "20px",
                    padding: "15px",
                    backgroundColor: "#e3f2fd",
                    borderRadius: "4px",
                    border: "1px solid #90caf9",
                }}
            >
                <div
                    style={{ fontWeight: "bold", marginBottom: "10px", color: "#1976d2" }}
                >
                    📊 Sequential Recordings Visualization
                </div>
                <div style={{ color: "#333", lineHeight: "1.5" }}>
                    This table contains intracellular electrophysiology recordings
                    organized by stimulus type.
                </div>
                {Object.keys(group.attrs).length > 0 && (
                    <div>
                        <strong>Description:</strong>{" "}
                        {group.attrs.description || "No description available"}
                    </div>
                )}
            </div>

            {/* Visualization */}
            <div
                style={{
                    width: width - 20,
                    height: height - 200,
                    border: "1px solid #ddd",
                    borderRadius: "4px",
                    overflow: "hidden",
                }}
            >
                <SequentialRecordingsPlotly
                    nwbUrl={nwbUrl}
                    path={path}
                    width={width - 20}
                    height={height - 200}
                    timeRange={timeRange}
                />
            </div>
        </div>
    );
};

export default SequentialRecordingsTableView;
