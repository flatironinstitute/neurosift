import { FunctionComponent, useEffect, useRef, useState } from "react";
import Plot from "react-plotly.js";
import { Data } from "plotly.js";

type Props = {
  timestamps?: number[];
  data?: number[][];
  labels?: string[];
};

const LabeledEventsPlot: FunctionComponent<Props> = ({
  timestamps,
  data,
  labels,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(800);

  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      if (entries[0]?.contentRect) {
        setContainerWidth(entries[0].contentRect.width);
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  if (!timestamps || !data || data.length === 0 || !labels) {
    return <div>Loading...</div>;
  }

  const colors = [
    "#1f77b4", // blue
    "#ff7f0e", // orange
    "#2ca02c", // green
    "#d62728", // red
    "#9467bd", // purple
    "#8c564b", // brown
    "#e377c2", // pink
    "#7f7f7f", // gray
  ];

  // For labeled events, we want to create scatter plots where each unique value (label)
  // gets its own color and appears in the legend
  // Create a single trace with all points
  const points = data.map((d, i) => ({
    timestamp: timestamps[i],
    value: d[0],
  }));

  const trace: Data = {
    x: points.map((p) => p.timestamp),
    y: points.map((p) => p.value),
    type: "scatter" as const,
    mode: "markers" as const,
    marker: {
      size: 10,
      symbol: "circle",
      color: points.map((p) => colors[p.value % colors.length]),
    },
    showlegend: false,
  };

  return (
    <div ref={containerRef} style={{ width: "100%" }}>
      <Plot
        data={[trace]}
        layout={{
          width: containerWidth - 20,
          height: 400,
          margin: {
            l: 50,
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
            showticklabels: true,
            showgrid: true,
          },
          yaxis: {
            showticklabels: true,
            showgrid: true,
            tickmode: "array",
            tickvals: Array.from(new Set(points.map((p) => p.value))).sort(
              (a, b) => a - b,
            ),
            ticktext: Array.from(new Set(points.map((p) => p.value)))
              .sort((a, b) => a - b)
              .map((v) => labels[v] || `Value ${v}`),
            range: [-1, Array.from(new Set(points.map((p) => p.value))).length],
          },
          showlegend: false,
          hovermode: "closest",
        }}
        config={{
          responsive: true,
          displayModeBar: false,
        }}
      />
    </div>
  );
};

export default LabeledEventsPlot;
