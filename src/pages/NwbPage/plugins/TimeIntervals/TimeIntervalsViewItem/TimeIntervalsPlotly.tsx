/* eslint-disable @typescript-eslint/no-explicit-any */
import { useTimeRange } from "@shared/context-timeseries-selection-2";
import { Data, Layout, Shape } from "plotly.js";
import { FunctionComponent, useMemo } from "react";
import Plot from "react-plotly.js";

type Props = {
  width: number;
  height: number;
  labels: string[] | undefined;
  allDistinctLabels: string[];
  startTimes: number[];
  stopTimes: number[];
  additionalData?: Record<string, any[]>; // For additional columns to show in hover
};

const TimeIntervalsPlotly: FunctionComponent<Props> = ({
  width,
  height,
  labels,
  allDistinctLabels,
  startTimes,
  stopTimes,
  additionalData,
}) => {
  // Get the visible time range from the context
  const { visibleStartTimeSec, visibleEndTimeSec } = useTimeRange();

  // Filter data points and shapes based on visible time range
  const filteredStartTimes = useMemo(() => {
    if (visibleStartTimeSec === undefined || visibleEndTimeSec === undefined) {
      return startTimes;
    }
    return startTimes.filter((_, i) => {
      // Include intervals that overlap with the visible range
      return (
        stopTimes[i] >= visibleStartTimeSec &&
        startTimes[i] <= visibleEndTimeSec
      );
    });
  }, [startTimes, stopTimes, visibleStartTimeSec, visibleEndTimeSec]);

  const filteredStopTimes = useMemo(() => {
    if (visibleStartTimeSec === undefined || visibleEndTimeSec === undefined) {
      return stopTimes;
    }
    return stopTimes.filter((_, i) => {
      return (
        stopTimes[i] >= visibleStartTimeSec &&
        startTimes[i] <= visibleEndTimeSec
      );
    });
  }, [startTimes, stopTimes, visibleStartTimeSec, visibleEndTimeSec]);

  const filteredLabels = useMemo(() => {
    if (
      !labels ||
      visibleStartTimeSec === undefined ||
      visibleEndTimeSec === undefined
    ) {
      return labels;
    }
    return labels.filter((_, i) => {
      return (
        stopTimes[i] >= visibleStartTimeSec &&
        startTimes[i] <= visibleEndTimeSec
      );
    });
  }, [labels, startTimes, stopTimes, visibleStartTimeSec, visibleEndTimeSec]);

  const filteredAdditionalData = useMemo(() => {
    if (
      !additionalData ||
      visibleStartTimeSec === undefined ||
      visibleEndTimeSec === undefined
    ) {
      return additionalData;
    }
    const filtered: Record<string, any[]> = {};
    Object.entries(additionalData).forEach(([key, values]) => {
      filtered[key] = values.filter((_, i) => {
        return (
          stopTimes[i] >= visibleStartTimeSec &&
          startTimes[i] <= visibleEndTimeSec
        );
      });
    });
    return filtered;
  }, [
    additionalData,
    startTimes,
    stopTimes,
    visibleStartTimeSec,
    visibleEndTimeSec,
  ]);

  // Create shapes for the intervals
  const shapes = useMemo(() => {
    const result: Partial<Shape>[] = [];

    if (!filteredStartTimes || !filteredStopTimes || !filteredLabels)
      return result;

    for (let i = 0; i < filteredStartTimes.length; i++) {
      if (!filteredLabels[i]) continue;

      const rowIndex = allDistinctLabels.indexOf(filteredLabels[i]);
      if (rowIndex === -1) continue;

      // Calculate vertical position based on label
      const y0 = 0.0 + rowIndex;
      const y1 = y0 + 1;

      result.push({
        type: "rect",
        x0: filteredStartTimes[i],
        x1: filteredStopTimes[i],
        y0: y0,
        y1: y1,
        fillcolor: lightColors[rowIndex % lightColors.length],
        line: {
          width: 1,
          color: darkenColor(lightColors[rowIndex % lightColors.length]),
        },
        layer: "below" as const,
        opacity: 0.7,
      });
    }

    return result;
  }, [
    filteredLabels,
    filteredStartTimes,
    filteredStopTimes,
    allDistinctLabels,
  ]);

  // Layout configuration
  const layout: Partial<Layout> = useMemo(
    () => ({
      width,
      height,
      margin: {
        l: 30, // Further reduced from 50
        r: 10, // Further reduced from 20
        t: 10, // Kept the same
        b: 50, // Kept the same for x-axis label
      },
      xaxis: {
        title: {
          text: "Time (s)",
          font: {
            size: 14,
            color: "#000",
          },
          standoff: 15, // Add some space between the axis and the title
        },
        showgrid: true,
        // Set the range to match the visible time range from the context
        range:
          visibleStartTimeSec !== undefined && visibleEndTimeSec !== undefined
            ? [visibleStartTimeSec, visibleEndTimeSec]
            : undefined,
        zeroline: false, // Remove the zero line
        showline: true, // Show the axis line
        linecolor: "#000", // Black line color
        linewidth: 2, // Make the axis line thicker
        mirror: false, // Don't mirror the axis line to the top
      },
      yaxis: {
        showgrid: false,
        tickmode: "array",
        tickvals: allDistinctLabels.map((_, i) => i),
        ticktext: allDistinctLabels,
        // Position all rectangles just above the x-axis
        range: [0, allDistinctLabels.length],
        zeroline: false, // Remove the zero line
        showticklabels: false, // Hide y-axis tick labels
        showline: false, // Hide the y-axis line
      },
      hovermode: "closest",
      showlegend: true,
      legend: {
        orientation: "h",
        y: -0.15,
        xanchor: "center",
        x: 0.5,
        font: { size: 10 },
        tracegroupgap: 5,
      },
      shapes: shapes,
    }),
    [
      width,
      height,
      allDistinctLabels,
      shapes,
      visibleStartTimeSec,
      visibleEndTimeSec,
    ],
  );

  // Create data traces for each distinct label
  const plotData = useMemo(() => {
    if (!filteredLabels || !filteredStartTimes || !filteredStopTimes)
      return [] as Data[];

    // Create a data trace for each distinct label
    return allDistinctLabels.map((label, labelIndex) => {
      // Find all intervals with this label
      const indices = filteredLabels
        .map((l, i) => (l === label ? i : -1))
        .filter((i) => i !== -1);

      // Create arrays for x and y coordinates - each interval needs both start and end points
      const xValues: number[] = [];
      const yValues: number[] = [];
      const hoverTexts: string[] = [];

      if (indices.length > 0) {
        // For each interval with this label, add its start and end points
        indices.forEach((i) => {
          const startTime = filteredStartTimes[i];
          const stopTime = filteredStopTimes[i];
          const midTime = (startTime + stopTime) / 2;

          // Add midpoint of the interval to show hover info
          xValues.push(midTime);
          yValues.push(labelIndex + 0.5); // Center of the row

          // Create hover text with interval details
          let hoverText =
            `<b>${label}</b><br>` +
            `Start: ${startTime.toFixed(3)}s<br>` +
            `End: ${stopTime.toFixed(3)}s<br>` +
            `Duration: ${(stopTime - startTime).toFixed(3)}s`;

          // Add any additional data to hover text, excluding the label field itself
          if (filteredAdditionalData) {
            Object.entries(filteredAdditionalData).forEach(([key, values]) => {
              // Skip the field that contains the label itself and any "labels" field
              if (
                values[i] !== undefined &&
                key !== "labels" &&
                values[i] !== label
              ) {
                hoverText += `<br>${key}: ${values[i]}`;
              }
            });
          }

          hoverTexts.push(hoverText);
        });
      } else {
        // If no visible intervals for this label, add a single invisible point
        // so the label still appears in the legend
        if (
          visibleStartTimeSec !== undefined &&
          visibleEndTimeSec !== undefined
        ) {
          xValues.push(visibleStartTimeSec);
          yValues.push(labelIndex + 0.5);
          hoverTexts.push(
            `<b>${label}</b><br>No visible intervals in current range`,
          );
        }
      }

      return {
        x: xValues,
        y: yValues,
        text: hoverTexts,
        name: label,
        mode: "markers" as const,
        type: "scatter" as const,
        marker: {
          color: lightColors[labelIndex % lightColors.length],
          size: 1, // Very small marker
          symbol: "circle",
          opacity: 0.0, // Completely transparent
        },
        line: {
          color: lightColors[labelIndex % lightColors.length],
          width: 0, // No line
        },
        fill: "toself",
        fillcolor: lightColors[labelIndex % lightColors.length],
        legendgroup: label,
        hoverinfo: "text" as const,
        hoverlabel: {
          bgcolor: "#FFF",
          bordercolor: darkenColor(
            lightColors[labelIndex % lightColors.length],
          ),
          font: { family: "Arial", size: 12 },
        },
        showlegend: true,
      } as Data;
    });
  }, [
    filteredLabels,
    filteredStartTimes,
    filteredStopTimes,
    allDistinctLabels,
    filteredAdditionalData,
    visibleStartTimeSec,
    visibleEndTimeSec,
  ]);

  return (
    <Plot
      data={plotData}
      layout={layout}
      config={{
        displayModeBar: true,
        displaylogo: false,
        responsive: true,
        modeBarButtonsToRemove: ["lasso2d", "select2d", "toggleSpikelines"],
      }}
      style={{
        width: "100%",
        height: "100%",
      }}
    />
  );
};

// Helper function to darken a color for the border
const darkenColor = (color: string): string => {
  // Extract rgba values
  const match = color.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
  if (!match) return color;

  const r = Math.max(0, parseInt(match[1]) - 30);
  const g = Math.max(0, parseInt(match[2]) - 30);
  const b = Math.max(0, parseInt(match[3]) - 30);
  const a = parseFloat(match[4]);

  return `rgba(${r}, ${g}, ${b}, ${a + 0.1})`;
};

const lightColors: string[] = [
  "rgba(170, 255, 170, 0.8)",
  "rgba(255, 170, 255, 0.8)",
  "rgba(0, 170, 255, 0.8)",
  "rgba(255, 170, 0, 0.8)",
  "rgba(255, 255, 170, 0.8)",
  "rgba(170, 255, 255, 0.8)",
  "rgba(255, 0, 255, 0.8)",
  "rgba(255, 255, 0, 0.8)",
  "rgba(0, 255, 255, 0.8)",
  "rgba(255, 170, 170, 0.8)",
  "rgba(170, 170, 255, 0.8)",
];

export default TimeIntervalsPlotly;
