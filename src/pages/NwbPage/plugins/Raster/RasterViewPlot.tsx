import { useMemo } from "react";
import Plot from "react-plotly.js";
import { Data } from "plotly.js";

type Props = {
  plotData: {
    unitIds: string[];
    spikeTimes: number[][];
  };
};

const RasterViewPlot = ({ plotData }: Props) => {
  const { traces, layout } = useMemo(() => {
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
          size: 3,
          symbol: "line-ns", // vertical line marker
          line: {
            width: 1,
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
      },
      yaxis: {
        title: "Units",
        ticktext: plotData.unitIds,
        tickvals: plotData.unitIds.map((_, i) => i),
        range: [-1, plotData.unitIds.length],
      },
      showlegend: false,
      height: Math.max(300, plotData.unitIds.length * 50), // Adjust height based on number of units
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
        }}
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
};

export default RasterViewPlot;
