import { useMemo } from "react";
import Plot from "react-plotly.js";
import { Data } from "plotly.js";

type Props = {
  plotData: {
    unitIds: string[];
    spikeTimes: number[][];
    startTime: number;
    duration: number;
    totalNumUnits: number;
  };
};

const RasterViewPlot = ({ plotData }: Props) => {
  const { traces, layout } = useMemo(() => {
    // Calculate marker size based on number of units
    // More units -> smaller markers, fewer units -> larger markers
    const markerSize = Math.max(
      7,
      Math.min(12, Math.floor(100 / plotData.unitIds.length)),
    );

    // Create one trace per unit
    const traces: Data[] = plotData.unitIds.map((unitId, index) => {
      const spikeTimes = plotData.spikeTimes[index];
      return {
        x: spikeTimes,
        y: Array(spikeTimes.length).fill(index),
        mode: "markers",
        type: "scatter" as const,
        name: `Unit ${unitId}`,
        marker: {
          size: markerSize,
          symbol: "line-ns", // vertical line marker
          line: {
            width: Math.max(1, markerSize / 4), // Scale line width with marker size
            color: "black",
          },
        },
        hoverinfo: "x+name" as const,
      };
    });

    const layout = {
      title: "Spike Raster Plot",
      xaxis: {
        title: "Time (s)",
        range: [plotData.startTime, plotData.startTime + plotData.duration],
      },
      yaxis: {
        title: "Units",
        ticktext: plotData.unitIds,
        tickvals: plotData.unitIds.map((_, i) => i),
        range: [-1, plotData.unitIds.length],
      },
      showlegend: false,
      height: Math.max(
        300,
        plotData.unitIds.length *
          Math.max(25, Math.min(50, Math.floor(400 / plotData.unitIds.length))),
      ), // Dynamic height per unit
      margin: {
        l: 70,
        r: 30,
        t: 50,
        b: 50,
      },
    };

    return { traces, layout };
  }, [plotData]);

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <Plot
        data={traces}
        layout={layout}
        config={{
          responsive: true,
          displayModeBar: true,
          modeBarButtonsToRemove: ["lasso2d", "select2d"],
          scrollZoom: false, // Disable scroll zoom since we handle time/unit navigation with buttons
        }}
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
};

export default RasterViewPlot;
