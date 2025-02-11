import { FunctionComponent, useMemo } from "react";
import Plot from "react-plotly.js";

type Props = {
  timestamps?: number[];
  data?: number[][];
  channelSeparation?: number; // Factor for channel separation (0 means no separation)
  width?: number;
  height?: number;
};

const TimeseriesPlot: FunctionComponent<Props> = ({
  timestamps,
  data,
  channelSeparation = 0,
  width,
  height,
}) => {
  // Memoize the transposed channel data
  const channelData = useMemo(() => {
    if (!data) return [];
    return data;
  }, [data]);

  // Memoize standard deviation calculations
  const avgStdDev = useMemo(() => {
    if (channelData.length === 0) return 0;

    // Calculate standard deviation for each channel
    const stdDevs = channelData.map((channel) => {
      const mean = channel.reduce((sum, val) => sum + val, 0) / channel.length;
      const squaredDiffs = channel.map((val) => Math.pow(val - mean, 2));
      const variance =
        squaredDiffs.reduce((sum, val) => sum + val, 0) / channel.length;
      return Math.sqrt(variance);
    });

    // Calculate average standard deviation across all channels
    return stdDevs.reduce((sum, std) => sum + std, 0) / stdDevs.length;
  }, [channelData]);

  // Memoize the separated channel data
  const separatedChannelData = useMemo(() => {
    if (channelData.length === 0) return [];
    if (channelSeparation === 0) return channelData;

    return channelData.map((channel, i) => {
      const offset =
        (channelData.length - 1 - i) * channelSeparation * avgStdDev;
      return channel.map((val) => val + offset);
    });
  }, [channelData, channelSeparation, avgStdDev]);

  if (!timestamps || !data || data.length === 0) {
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

  return (
    <Plot
      data={separatedChannelData.map((channelValues, i) => ({
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
        width: (width || 700) - 20,
        height: height || 300,
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
            text:
              channelSeparation > 0 ? "Value (channels separated)" : "Value",
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
  );
};

export default TimeseriesPlot;
