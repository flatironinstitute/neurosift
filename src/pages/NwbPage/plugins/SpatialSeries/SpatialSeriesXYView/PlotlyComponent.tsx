import { FunctionComponent } from "react";
import Plot from "react-plotly.js";
import { Layout, PlotData } from "plotly.js";

type Props = {
  data: {
    x: number[];
    y: number[];
    t: number[];
  };
  width: number;
  height: number;
  onPointClick?: (index: number) => void;
  currentTime?: number;
  valueRange?: {
    xMin: number;
    xMax: number;
    yMin: number;
    yMax: number;
  };
  unit?: string;
};

const PlotlyComponent: FunctionComponent<Props> = ({
  data,
  width,
  height,
  onPointClick,
  currentTime,
  valueRange,
  unit,
}) => {
  const currentIndex =
    currentTime !== undefined ? data.t.findIndex((t) => t === currentTime) : -1;

  // Create a gradient based on the time values
  const colorScale = data.t.map((t, i) =>
    Math.round((i / (data.t.length - 1)) * 100),
  );

  const traces: Partial<PlotData>[] = [
    {
      x: data.x,
      y: data.y,
      type: "scatter",
      mode: "markers",
      marker: {
        size: 6,
        color: colorScale,
        colorscale: "Viridis",
        opacity: 0.6,
        showscale: true,
        colorbar: {
          title: "Time Progress",
          tickmode: "array",
          ticktext: ["Start", "End"],
          tickvals: [0, 100],
        },
      },
      showlegend: false,
    },
    {
      x: data.x,
      y: data.y,
      type: "scatter",
      mode: "lines",
      line: {
        color: "#2E8B57",
        width: 1,
      },
      showlegend: false,
      hoverinfo: "skip",
    },
  ];

  // Add current point if it exists
  if (currentIndex !== -1) {
    traces.push({
      x: [data.x[currentIndex]],
      y: [data.y[currentIndex]],
      type: "scatter",
      mode: "markers",
      marker: {
        size: 10,
        color: "red",
        opacity: 1,
      },
      name: "Current",
    });
  }

  const layout: Partial<Layout> = {
    width,
    height,
    margin: {
      l: 60,
      r: 80, // Increased right margin to accommodate colorbar
      t: 20,
      b: 40,
    },
    showlegend: false,
    xaxis: {
      title: unit ? `X (${unit})` : "X",
      range: valueRange ? [valueRange.xMin, valueRange.xMax] : undefined,
    },
    yaxis: {
      title: unit ? `Y (${unit})` : "Y",
      range: valueRange ? [valueRange.yMin, valueRange.yMax] : undefined,
      scaleanchor: "x",
      scaleratio: 1,
    },
    hovermode: "closest",
  };

  const handleClick = (event: { points?: Array<{ pointIndex: number }> }) => {
    if (!onPointClick || !event.points || event.points.length === 0) return;
    const pointIndex = event.points[0].pointIndex;
    onPointClick(pointIndex);
  };

  return (
    <Plot
      data={traces}
      layout={layout}
      config={{
        displayModeBar: false,
        responsive: true,
      }}
      onClick={handleClick}
      style={{
        width: "100%",
        height: "100%",
      }}
    />
  );
};

export default PlotlyComponent;
