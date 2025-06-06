/* eslint-disable @typescript-eslint/no-explicit-any */
import { FunctionComponent, useMemo } from "react";
import Plot from "react-plotly.js";
import { Data, Layout } from "plotly.js";

const colors = [
    "#1f77b4", // blue
    "#ff7f0e", // orange
    "#2ca02c", // green
    "#d62728", // red
    "#9467bd", // purple
    "#8c564b", // brown
    "#e377c2", // pink
    "#7f7f7f", // gray
    "#bcbd22", // olive
    "#17becf", // cyan
];

type Props = {
    width: number;
    height: number;
    traces: number[][];
    timestamps: number[];
    traceLabels: string[];
    visibleStartTime?: number;
    visibleEndTime?: number;
};

const SequentialRecordingsPlotly: FunctionComponent<Props> = ({
    width,
    height,
    traces,
    timestamps,
    traceLabels,
    visibleStartTime,
    visibleEndTime,
}) => {
    // Calculate time range
    const timeRange = useMemo(() => {
        if (visibleStartTime !== undefined && visibleEndTime !== undefined) {
            return [visibleStartTime, visibleEndTime] as [number, number];
        }
        if (timestamps.length === 0) {
            return [0, 1] as [number, number];
        }
        const minTime = Math.min(...timestamps);
        const maxTime = Math.max(...timestamps);
        const padding = (maxTime - minTime) * 0.05;
        return [minTime - padding, maxTime + padding] as [number, number];
    }, [timestamps, visibleStartTime, visibleEndTime]);

    // Prepare plot data
    const plotData = useMemo(() => {
        return traces.map((trace, i) => ({
            x: timestamps,
            y: trace,
            type: "scatter" as const,
            mode: "lines" as const,
            line: {
                color: colors[i % colors.length],
                width: 2,
            },
            name: traceLabels[i] || `Trace ${i}`,
            hovertemplate:
                `<b>${traceLabels[i] || `Trace ${i}`}</b><br>` +
                "Time: %{x:.3f}s<br>" +
                "Value: %{y:.3f}<br>" +
                "<extra></extra>",
        })) as Data[];
    }, [traces, timestamps, traceLabels]);

    const layout: Partial<Layout> = useMemo(() => ({
        width: width - 20,
        height: height - 20,
        margin: {
            l: 60,
            r: 20,
            t: 20,
            b: 50,
        },
        xaxis: {
            title: {
                text: "Time (s)",
                font: {
                    size: 14,
                    color: "#000",
                },
                standoff: 10,
            },
            range: timeRange,
            showticklabels: true,
            showgrid: true,
            gridcolor: "#e0e0e0",
        },
        yaxis: {
            title: {
                text: "Amplitude",
                font: {
                    size: 14,
                    color: "#000",
                },
                standoff: 5,
            },
            showticklabels: true,
            showgrid: true,
            gridcolor: "#e0e0e0",
        },
        showlegend: true,
        legend: {
            x: 1.02,
            y: 1,
            xanchor: "left" as const,
            yanchor: "top" as const,
            bgcolor: "rgba(255,255,255,0.8)",
            bordercolor: "#ccc",
            borderwidth: 1,
        },
        plot_bgcolor: "white",
        paper_bgcolor: "white",
    }), [height, width, timeRange]);

    const config = useMemo(() => ({
        responsive: true,
        displayModeBar: true,
        modeBarButtonsToRemove: ["lasso2d", "select2d", "toggleSpikelines"] as any,
        displaylogo: false,
    }), []);

    if (!timestamps || !traces || traces.length === 0) {
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
                No trace data available
            </div>
        );
    }

    return <Plot data={plotData} layout={layout} config={config} />;
};

export default SequentialRecordingsPlotly;
