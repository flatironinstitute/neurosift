/* eslint-disable @typescript-eslint/no-explicit-any */
import { FunctionComponent, useCallback, useMemo } from "react";
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
  // onPointClick?: (index: number) => void;
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
  // onPointClick,
  currentTime,
  valueRange,
  unit,
}) => {
  // const currentIndex =
  //   currentTime !== undefined ? data.t.findIndex((t) => t === currentTime) : -1;

  // Create a gradient based on the time values
  const colorScale = useMemo(
    () => data.t.map((_t, i) => Math.round((i / (data.t.length - 1)) * 100)),
    [data.t],
  );

  const currentIndex = useMemo(() => {
    if (currentTime === undefined) return -1;
    let closestIndex = -1;
    let closestDistance = Number.MAX_VALUE;
    for (let i = 0; i < data.t.length; i++) {
      const distance = Math.abs(data.t[i] - currentTime);
      if (distance < closestDistance) {
        closestIndex = i;
        closestDistance = distance;
      }
    }
    return closestIndex;
  }, [currentTime, data.t]);

  const traces: Partial<PlotData>[] = useMemo(() => {
    const traces = [
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
    ] as any[];
    // Add current point if it exists
    if (currentIndex >= 0) {
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
    return traces;
  }, [data.x, data.y, colorScale, currentIndex]);

  const layout: Partial<Layout> = useMemo(
    () => ({
      width,
      height,
      margin: {
        l: 80, // Increased left margin for y-axis title
        r: 80, // Right margin for colorbar
        t: 20,
        b: 60, // Increased bottom margin for x-axis title
        pad: 0,
      },
      showlegend: false,
      xaxis: {
        title: {
          text: unit ? `X (${unit})` : "X",
          standoff: 20, // Add some space between axis and title
        },
        range: valueRange ? [valueRange.xMin, valueRange.xMax] : undefined,
        showgrid: true,
        zeroline: true,
      },
      yaxis: {
        title: {
          text: unit ? `Y (${unit})` : "Y",
          standoff: 20, // Add some space between axis and title
        },
        range: valueRange ? [valueRange.yMin, valueRange.yMax] : undefined,
        scaleanchor: "x",
        scaleratio: 1,
        showgrid: true,
        zeroline: true,
      },
      hovermode: "closest",
    }),
    [valueRange, unit, width, height],
  );

  // const handleClick = useCallback(
  //   (event: { points?: Array<{ pointIndex: number }> }) => {
  //     if (!onPointClick || !event.points || event.points.length === 0) return;
  //     const pointIndex = event.points[0].pointIndex;
  //     onPointClick(pointIndex);
  //   },
  //   [onPointClick],
  // );

  return (
    <Plot
      data={traces}
      layout={layout}
      config={{
        displayModeBar: false,
        responsive: true,
      }}
      // onClick={handleClick}
      style={{
        width: "100%",
        height: "100%",
      }}
    />
  );
};

export default PlotlyComponent;
