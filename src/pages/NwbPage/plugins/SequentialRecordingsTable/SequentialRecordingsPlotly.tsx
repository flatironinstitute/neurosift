/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useMemo, useState } from "react";
import Plot from "react-plotly.js";
import { Data, Layout } from "plotly.js";
import { useSequentialRecordingsData } from "./useSequentialRecordingsData";
import { SequentialRecordingsPair } from "./types";

const colors = [
    "#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd",
    "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf",
    "#aec7e8", "#ffbb78", "#98df8a", "#ff9896", "#c5b0d5",
    "#c49c94", "#f7b6d3", "#c7c7c7", "#dbdb8d", "#9edae5"
];

type Props = {
    nwbUrl: string;
    path: string;
    width?: number;
    height?: number;
    timeRange?: { start: number; duration: number };
};

const SequentialRecordingsPlotly: React.FC<Props> = ({
    nwbUrl,
    path,
    width = 1100,
    height = 650,
    timeRange,
}) => {
    const { pairs, stimulusTypes, isLoading, error } = useSequentialRecordingsData(
        nwbUrl,
        path,
        timeRange
    );

    const [selectedStimulusType, setSelectedStimulusType] = useState<string>("");
    const [visiblePairs, setVisiblePairs] = useState<Set<number>>(new Set());

    // Initialize visible pairs and stimulus type when data loads
    React.useEffect(() => {
        if (pairs.length > 0 && visiblePairs.size === 0) {
            setVisiblePairs(new Set(pairs.map(p => p.pairId)));
        }
        if (stimulusTypes.length > 0 && selectedStimulusType === "") {
            setSelectedStimulusType(stimulusTypes[0]);
        }
    }, [pairs, visiblePairs.size, stimulusTypes, selectedStimulusType]);

    // Filter pairs based on selected stimulus type
    const filteredPairs = useMemo(() => {
        return pairs.filter(pair => pair.stimulusType === selectedStimulusType);
    }, [pairs, selectedStimulusType]);

    // Create Plotly data for overlapping traces with relative times
    const plotData = useMemo(() => {
        const traces: Data[] = [];

        filteredPairs.forEach((pair) => {
            const color = colors[pair.pairId % colors.length];
            const label = `${pair.stimulusType} #${pair.pairId}`;
            const isVisible = visiblePairs.has(pair.pairId);

            // Normalize timestamps to start at zero
            const stimulusStartTime = pair.stimulusData.timestamps[0] || 0;
            const responseStartTime = pair.responseData.timestamps[0] || 0;

            const relativeStimTimes = pair.stimulusData.timestamps.map(t => t - stimulusStartTime);
            const relativeRespTimes = pair.responseData.timestamps.map(t => t - responseStartTime);

            // Stimulus trace (left subplot)
            traces.push({
                x: relativeStimTimes,
                y: pair.stimulusData.data,
                type: "scatter",
                mode: "lines",
                line: { color, width: 2 },
                name: `${label} (stim)`,
                legendgroup: `pair-${pair.pairId}`,
                showlegend: true,
                visible: isVisible,
                xaxis: "x",
                yaxis: "y",
                hovertemplate:
                    `<b>${label} (Stimulus)</b><br>` +
                    "Time: %{x:.3f}s<br>" +
                    "Value: %{y:.3f}<br>" +
                    "<extra></extra>",
            });

            // Response trace (right subplot)
            traces.push({
                x: relativeRespTimes,
                y: pair.responseData.data,
                type: "scatter",
                mode: "lines",
                line: { color, width: 2 },
                name: `${label} (resp)`,
                legendgroup: `pair-${pair.pairId}`,
                showlegend: false,
                visible: isVisible,
                xaxis: "x2",
                yaxis: "y2",
                hovertemplate:
                    `<b>${label} (Response)</b><br>` +
                    "Time: %{x:.3f}s<br>" +
                    "Value: %{y:.3f}<br>" +
                    "<extra></extra>",
            });
        });

        return traces;
    }, [filteredPairs, visiblePairs]);

    // Layout configuration for dual subplots
    const layout: Partial<Layout> = useMemo(() => ({
        title: {
            text: `Sequential Recordings - ${selectedStimulusType}`,
            x: 0.5,
            xanchor: "center",
        },
        width: width - 20,
        height: height - 20,
        margin: { l: 60, r: 150, t: 80, b: 60 },

        // Left subplot (Stimulus)
        xaxis: {
            title: "Time (s)",
            domain: [0, 0.48],
            showgrid: true,
            gridcolor: "#e0e0e0",
        },
        yaxis: {
            title: "Stimulus (command)",
            domain: [0, 1],
            showgrid: true,
            gridcolor: "#e0e0e0",
        },

        // Right subplot (Response)
        xaxis2: {
            title: "Time (s)",
            domain: [0.52, 1],
            showgrid: true,
            gridcolor: "#e0e0e0",
        },
        yaxis2: {
            title: "Response (V)",
            domain: [0, 1],
            showgrid: true,
            gridcolor: "#e0e0e0",
        },

        legend: {
            title: { text: "Pairs" },
            x: 1.02,
            y: 1,
            xanchor: "left",
            yanchor: "top",
            bgcolor: "rgba(255,255,255,0.8)",
            bordercolor: "#ccc",
            borderwidth: 1,
        },

        plot_bgcolor: "white",
        paper_bgcolor: "white",
        dragmode: "zoom",
    }), [width, height, selectedStimulusType]);

    const config = useMemo(() => ({
        responsive: true,
        displayModeBar: true,
        modeBarButtonsToRemove: ["lasso2d", "select2d"] as any,
        displaylogo: false,
    }), []);

    // Handle legend click to toggle pair visibility
    const handleLegendClick = (event: any) => {
        // For legend clicks, the event structure is different
        // We need to access the trace data directly from the event
        if (event && event.data && (event.data as any).legendgroup) {
            const legendgroup = (event.data as any).legendgroup;
            const pairId = parseInt(legendgroup.split("-")[1]);

            setVisiblePairs(prev => {
                const newSet = new Set(prev);
                if (newSet.has(pairId)) {
                    newSet.delete(pairId);
                } else {
                    newSet.add(pairId);
                }
                return newSet;
            });
        } else if (event && event.curveNumber !== undefined) {
            // Alternative: use curveNumber to find the trace in plotData
            const trace = plotData[event.curveNumber];
            if (trace && (trace as any).legendgroup) {
                const pairId = parseInt((trace as any).legendgroup.split("-")[1]);

                setVisiblePairs(prev => {
                    const newSet = new Set(prev);
                    if (newSet.has(pairId)) {
                        newSet.delete(pairId);
                    } else {
                        newSet.add(pairId);
                    }
                    return newSet;
                });
            }
        }

        return false; // Prevent default legend behavior
    };

    if (isLoading) {
        return (
            <div
                style={{
                    width: width - 20,
                    height: height - 20,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "#f8f9fa",
                    border: "1px solid #dee2e6",
                    borderRadius: "4px",
                    color: "#666",
                    fontSize: "14px",
                }}
            >
                Loading sequential recordings data...
            </div>
        );
    }

    if (error) {
        return (
            <div
                style={{
                    width: width - 20,
                    height: height - 20,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "#f8f9fa",
                    border: "1px solid #dee2e6",
                    borderRadius: "4px",
                    color: "#dc3545",
                    fontSize: "14px",
                    textAlign: "center",
                    padding: "20px",
                }}
            >
                <div>
                    <strong>Error loading data:</strong>
                    <br />
                    {error}
                </div>
            </div>
        );
    }

    if (pairs.length === 0) {
        return (
            <div
                style={{
                    width: width - 20,
                    height: height - 20,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "#f8f9fa",
                    border: "1px solid #dee2e6",
                    borderRadius: "4px",
                    color: "#666",
                    fontSize: "14px",
                }}
            >
                No sequential recordings found in this dataset.
            </div>
        );
    }

    return (
        <div style={{ width, height }}>
            {/* Controls */}
            <div style={{
                display: "flex",
                gap: "10px",
                marginBottom: "10px",
                alignItems: "center",
                padding: "10px",
                backgroundColor: "#f8f9fa",
                borderRadius: "4px",
                border: "1px solid #dee2e6"
            }}>
                <label style={{ fontWeight: "bold" }}>
                    Stimulus Type:
                    <select
                        value={selectedStimulusType}
                        onChange={(e) => setSelectedStimulusType(e.target.value)}
                        style={{
                            marginLeft: "5px",
                            padding: "4px 8px",
                            borderRadius: "4px",
                            border: "1px solid #ccc",
                        }}
                    >
                        {stimulusTypes.map(type => (
                            <option key={type} value={type}>{type}</option>
                        ))}
                    </select>
                </label>

                <span style={{ color: "#666", fontSize: "14px" }}>
                    Showing {filteredPairs.filter(p => visiblePairs.has(p.pairId)).length} of {filteredPairs.length} pairs
                </span>
            </div>

            {/* Plot */}
            <Plot
                data={plotData}
                layout={layout}
                config={config}
                onLegendClick={handleLegendClick}
            />
        </div>
    );
};

export default SequentialRecordingsPlotly;
