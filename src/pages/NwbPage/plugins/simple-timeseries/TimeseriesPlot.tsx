import { FunctionComponent, useEffect, useRef, useState } from "react";
import Plot from "react-plotly.js";

type Props = {
  timestamps?: number[];
  data?: number[][];
};

const TimeseriesPlot: FunctionComponent<Props> = ({ timestamps, data }) => {
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

  if (!timestamps || !data || data.length === 0) {
    return <div>Loading...</div>;
  }

  const numChannels = data[0].length;
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

  // Transpose the data array from [timepoints][channels] to [channels][timepoints]
  const channelData = Array(numChannels)
    .fill(0)
    .map((_, channelIndex) => data.map((timepoint) => timepoint[channelIndex]));

  return (
    <div ref={containerRef} style={{ width: "100%" }}>
      <Plot
        data={channelData.map((channelValues, i) => ({
          x: timestamps,
          y: channelValues,
          type: "scatter",
          mode: "lines",
          line: {
            color: colors[i % colors.length],
          },
          name: `Channel ${i}`,
        }))}
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
            title: {
              text: "Value",
              font: {
                size: 14,
                color: "#000",
              },
              standoff: 5,
            },
            showticklabels: true,
            showgrid: true,
          },
          showlegend: true,
        }}
        config={{
          responsive: true,
          displayModeBar: false,
        }}
      />
    </div>
  );
};

export default TimeseriesPlot;
