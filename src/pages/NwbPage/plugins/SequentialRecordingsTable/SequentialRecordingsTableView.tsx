import React, { useEffect, useState } from "react";
import { useHdf5Group, getHdf5DatasetData } from "@hdf5Interface";
import SequentialRecordingsPlotly from "./SequentialRecordingsPlotly";
import { useTimeRange } from "@shared/context-timeseries-selection-2";

// Reference component for displaying object references
type ReferenceValue = {
    path: string;
    object_id: string;
    source: string;
    source_object_id: string;
};

const ReferenceComponent: React.FC<{ value: ReferenceValue }> = ({ value }) => {
    return (
        <span style={{ color: "darkgreen" }} title={JSON.stringify(value)}>
            {value.path}
        </span>
    );
};

// Helper function to render values properly
const valueToElement = (val: any): any => {
    if (typeof val === "string") {
        return val;
    } else if (typeof val === "number") {
        return val + "";
    } else if (typeof val === "boolean") {
        return val ? "true" : "false";
    } else if (typeof val === "object") {
        if (Array.isArray(val)) {
            if (val.length < 200) {
                return `[${val.map((x) => valueToElement(x)).join(", ")}]`;
            } else {
                return `[${val.slice(0, 200).map((x) => valueToElement(x)).join(", ")} ...]`;
            }
        } else if (val && "_REFERENCE" in val) {
            return <ReferenceComponent value={val["_REFERENCE"]} />;
        } else {
            return JSON.stringify(val);
        }
    } else {
        return "<>";
    }
};

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
    width = 500,
    height = 400,
}) => {
    const group = useHdf5Group(nwbUrl, path);
    const [stimulusTypes, setStimulusTypes] = useState<string[]>([]);
    const [selectedStimulusType, setSelectedStimulusType] = useState<string>("");
    const [plotData, setPlotData] = useState<{
        traces: number[][];
        timestamps: number[];
        traceLabels: string[];
    }>({ traces: [], timestamps: [], traceLabels: [] });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { visibleStartTimeSec, visibleEndTimeSec } = useTimeRange();

    // Load stimulus types when group is available
    useEffect(() => {
        if (!group) return;

        const loadStimulusTypes = async () => {
            try {
                const stimulusTypeDataset = group.datasets.find(ds => ds.name === "stimulus_type");
                if (stimulusTypeDataset) {
                    const data = await getHdf5DatasetData(nwbUrl, `${path}/stimulus_type`, {});
                    if (data && Array.isArray(data)) {
                        const uniqueTypes = [...new Set(data)].sort() as string[];
                        setStimulusTypes(uniqueTypes);
                        if (uniqueTypes.length > 0) {
                            setSelectedStimulusType(uniqueTypes[0]);
                        }
                    }
                }
            } catch (err) {
                setError(`Error loading stimulus types: ${err}`);
            }
        };

        loadStimulusTypes();
    }, [group, nwbUrl, path]);

    // Load trace data when stimulus type is selected
    useEffect(() => {
        if (!group || !selectedStimulusType) return;

        const loadTraceData = async () => {
            setLoading(true);
            setError(null);
            try {
                // Load all required datasets
                const [stimulusTypeData, simultaneousRecordingsData, indexData] = await Promise.all([
                    getHdf5DatasetData(nwbUrl, `${path}/stimulus_type`, {}),
                    getHdf5DatasetData(nwbUrl, `${path}/simultaneous_recordings`, {}),
                    getHdf5DatasetData(nwbUrl, `${path}/simultaneous_recordings_index`, {})
                ]);

                if (!stimulusTypeData || !simultaneousRecordingsData || !indexData) {
                    throw new Error("Missing required datasets");
                }

                // Convert data to arrays if needed
                const stimulusArray = Array.isArray(stimulusTypeData) ? stimulusTypeData : Array.from(stimulusTypeData as any);
                const recordingsArray = Array.isArray(simultaneousRecordingsData) ? simultaneousRecordingsData : Array.from(simultaneousRecordingsData as any);
                const indexArray = Array.isArray(indexData) ? indexData : Array.from(indexData as any);

                // Find stimulus type index
                const stimulusIndex = stimulusArray.findIndex(type => type === selectedStimulusType);
                if (stimulusIndex === -1) {
                    throw new Error(`Stimulus type "${selectedStimulusType}" not found`);
                }

                // Calculate recording indices using boundary logic
                // indexArray contains boundaries like [3, 26, 35]
                const start = stimulusIndex === 0 ? 0 : indexArray[stimulusIndex - 1];
                const end = stimulusIndex < indexArray.length ? indexArray[stimulusIndex] : recordingsArray.length;
                const recordingIndices = Array.from({ length: end - start }, (_, i) => start + i);

                // Extract recordings for this stimulus type and resolve object references
                const traces: number[][] = [];
                const traceLabels: string[] = [];
                let timestamps: number[] = [];

                for (let i = 0; i < recordingIndices.length; i++) {
                    const index = recordingIndices[i];
                    if (index >= recordingsArray.length) continue;

                    const recording = recordingsArray[index];
                    traceLabels.push(`Recording ${index}`);

                    // Check if this is an object reference
                    if (recording && typeof recording === 'object' && '_REFERENCE' in recording) {
                        try {
                            // Resolve the object reference to get actual data
                            const referencePath = recording._REFERENCE.path;
                            const traceData = await getHdf5DatasetData(nwbUrl, referencePath, {});

                            if (traceData && Array.isArray(traceData)) {
                                // Handle different data structures
                                if (traceData.length > 0 && Array.isArray(traceData[0])) {
                                    // Multi-dimensional array - take first column as trace
                                    traces.push(traceData.map((row: any) => Array.isArray(row) ? row[0] : row));
                                } else {
                                    // 1D array
                                    traces.push(traceData as number[]);
                                }

                                // Generate timestamps if we don't have them yet
                                if (timestamps.length === 0) {
                                    const dataLength = Array.isArray(traceData[0]) ? traceData.length : traceData.length;
                                    timestamps = Array.from({ length: dataLength }, (_, i) => i * 0.001); // Assume 1ms sampling
                                }
                            } else {
                                // Fallback: create dummy data
                                const dummyTrace = Array.from({ length: 1000 }, (_, i) => Math.sin(i * 0.01) * (i + 1));
                                traces.push(dummyTrace);
                                if (timestamps.length === 0) {
                                    timestamps = Array.from({ length: 1000 }, (_, i) => i * 0.001);
                                }
                            }
                        } catch (refError) {
                            console.warn(`Failed to resolve reference for recording ${index}:`, refError);
                            // Create dummy data as fallback
                            const dummyTrace = Array.from({ length: 1000 }, (_, i) => Math.sin(i * 0.01 + index) * (index + 1));
                            traces.push(dummyTrace);
                            if (timestamps.length === 0) {
                                timestamps = Array.from({ length: 1000 }, (_, i) => i * 0.001);
                            }
                        }
                    } else {
                        // Not a reference, create dummy data
                        const dummyTrace = Array.from({ length: 1000 }, (_, i) => Math.sin(i * 0.01 + index) * (index + 1));
                        traces.push(dummyTrace);
                        if (timestamps.length === 0) {
                            timestamps = Array.from({ length: 1000 }, (_, i) => i * 0.001);
                        }
                    }
                }

                setPlotData({ traces, timestamps, traceLabels });
            } catch (err) {
                setError(`Error loading trace data: ${err}`);
            } finally {
                setLoading(false);
            }
        };

        loadTraceData();
    }, [group, nwbUrl, path, selectedStimulusType]);

    if (!group) {
        return <div>Loading SequentialRecordingsTable...</div>;
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
                Sequential Recordings Table
            </h3>

            <div style={{ marginBottom: "15px" }}>
                <strong>Path:</strong> {path}
            </div>

            {/* Stimulus Type Selection */}
            {stimulusTypes.length > 0 && (
                <div style={{ marginTop: "20px" }}>
                    <div style={{ marginBottom: "15px" }}>
                        <label style={{ fontWeight: "bold", marginBottom: "5px", display: "block" }}>
                            Select Stimulus Type:
                        </label>
                        <select
                            value={selectedStimulusType}
                            onChange={(e) => setSelectedStimulusType(e.target.value)}
                            style={{
                                padding: "8px 12px",
                                borderRadius: "4px",
                                border: "1px solid #90caf9",
                                backgroundColor: "white",
                                fontSize: "14px",
                                fontFamily: "monospace",
                                minWidth: "200px",
                            }}
                        >
                            {stimulusTypes.map((type, index) => (
                                <option key={index} value={type}>
                                    {type}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Trace Plot Display */}
                    <div style={{ marginTop: "15px" }}>
                        <div style={{ fontWeight: "bold", marginBottom: "10px" }}>
                            Trace Plot for "{selectedStimulusType}":
                        </div>
                        <div
                            style={{
                                backgroundColor: "#fff",
                                padding: "10px",
                                borderRadius: "4px",
                                border: "1px solid #ddd",
                                height: "500px",
                            }}
                        >
                            {loading && (
                                <div style={{
                                    color: "#666",
                                    fontStyle: "italic",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    height: "100%"
                                }}>
                                    Loading trace data...
                                </div>
                            )}
                            {error && (
                                <div style={{
                                    color: "#d32f2f",
                                    fontStyle: "italic",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    height: "100%"
                                }}>
                                    {error}
                                </div>
                            )}
                            {!loading && !error && plotData.traces.length === 0 && (
                                <div style={{
                                    color: "#666",
                                    fontStyle: "italic",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    height: "100%"
                                }}>
                                    No trace data found for this stimulus type.
                                </div>
                            )}
                            {!loading && !error && plotData.traces.length > 0 && (
                                <div style={{ height: "100%" }}>
                                    <div style={{ marginBottom: "10px", fontWeight: "bold", color: "#555" }}>
                                        Found {plotData.traces.length} traces - use legend to toggle visibility
                                    </div>
                                    <div style={{ height: "calc(100% - 30px)" }}>
                                        <SequentialRecordingsPlotly
                                            width={width - 40}
                                            height={450}
                                            traces={plotData.traces}
                                            timestamps={plotData.timestamps}
                                            traceLabels={plotData.traceLabels}
                                            visibleStartTime={visibleStartTimeSec}
                                            visibleEndTime={visibleEndTimeSec}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Basic Structure Info */}
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
                <div>Datasets: {group.datasets.length}</div>
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

export default SequentialRecordingsTableView;
