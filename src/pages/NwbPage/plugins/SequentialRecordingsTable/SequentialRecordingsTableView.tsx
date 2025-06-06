import React, { useEffect, useState } from "react";
import { useHdf5Group, getHdf5DatasetData } from "@hdf5Interface";

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
    const [recordings, setRecordings] = useState<{ index: number; data: any; isReference: boolean }[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

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

    // Load recordings when stimulus type is selected
    useEffect(() => {
        if (!group || !selectedStimulusType) return;

        const loadRecordings = async () => {
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

                // Extract recordings for this stimulus type
                const recordingsForStimulus = recordingIndices.map(index => ({
                    index,
                    data: index < recordingsArray.length ? recordingsArray[index] : `Index ${index} out of bounds`,
                    isReference: index < recordingsArray.length &&
                        typeof recordingsArray[index] === 'object' &&
                        recordingsArray[index] !== null &&
                        '_REFERENCE' in recordingsArray[index]
                }));

                setRecordings(recordingsForStimulus);
            } catch (err) {
                setError(`Error loading recordings: ${err}`);
            } finally {
                setLoading(false);
            }
        };

        loadRecordings();
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

                    {/* Recordings Display */}
                    <div style={{ marginTop: "15px" }}>
                        <div style={{ fontWeight: "bold", marginBottom: "10px" }}>
                            Simultaneous Recordings for "{selectedStimulusType}":
                        </div>
                        <div
                            style={{
                                backgroundColor: "#fff",
                                padding: "10px",
                                borderRadius: "4px",
                                border: "1px solid #ddd",
                                maxHeight: "400px",
                                overflow: "auto",
                            }}
                        >
                            {loading && (
                                <div style={{ color: "#666", fontStyle: "italic" }}>
                                    Loading recordings...
                                </div>
                            )}
                            {error && (
                                <div style={{ color: "#d32f2f", fontStyle: "italic" }}>
                                    {error}
                                </div>
                            )}
                            {!loading && !error && recordings.length === 0 && (
                                <div style={{ color: "#666", fontStyle: "italic" }}>
                                    No recordings found for this stimulus type.
                                </div>
                            )}
                            {!loading && !error && recordings.length > 0 && (
                                <div>
                                    <div style={{ marginBottom: "10px", fontWeight: "bold", color: "#555" }}>
                                        Found {recordings.length} recordings at indices: [{recordings.map(r => r.index).join(", ")}]
                                    </div>
                                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                        {recordings.map((recording, displayIndex) => (
                                            <div
                                                key={displayIndex}
                                                style={{
                                                    backgroundColor: "#f8f9fa",
                                                    padding: "12px",
                                                    borderRadius: "6px",
                                                    border: "1px solid #e9ecef",
                                                    fontSize: "12px",
                                                }}
                                            >
                                                <div style={{
                                                    fontWeight: "bold",
                                                    marginBottom: "8px",
                                                    color: "#2c5aa0",
                                                    borderBottom: "1px solid #ddd",
                                                    paddingBottom: "4px"
                                                }}>
                                                    Recording at Index {recording.index}
                                                </div>
                                                <div style={{ marginBottom: "6px" }}>
                                                    <span style={{ fontWeight: "bold", color: "#666" }}>
                                                        Stimulus Type:
                                                    </span>
                                                    <span style={{
                                                        marginLeft: "8px",
                                                        backgroundColor: "#e3f2fd",
                                                        padding: "2px 6px",
                                                        borderRadius: "3px",
                                                        fontFamily: "monospace"
                                                    }}>
                                                        {selectedStimulusType}
                                                    </span>
                                                </div>
                                                <div style={{ marginTop: "8px" }}>
                                                    <div style={{ fontWeight: "bold", color: "#666", marginBottom: "4px" }}>
                                                        Recording Data:
                                                    </div>
                                                    <div style={{
                                                        backgroundColor: "#ffffff",
                                                        padding: "8px",
                                                        borderRadius: "4px",
                                                        border: "1px solid #ddd",
                                                        fontFamily: "monospace",
                                                        wordBreak: "break-all",
                                                        maxHeight: "150px",
                                                        overflow: "auto"
                                                    }}>
                                                        {recording.isReference ? (
                                                            <div>
                                                                <div style={{
                                                                    color: "#d32f2f",
                                                                    fontWeight: "bold",
                                                                    marginBottom: "4px"
                                                                }}>
                                                                    Object Reference:
                                                                </div>
                                                                {valueToElement(recording.data)}
                                                            </div>
                                                        ) : (
                                                            valueToElement(recording.data)
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
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
