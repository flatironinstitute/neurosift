import { FunctionComponent } from "react";
import Plot from "react-plotly.js";

type LogPlotProps = {
  series: {
    label: string;
    data: { x: number; y: number }[];
    color: string;
  }[];
  referenceTime: number;
  yAxisLabel?: string;
};

const LogPlot: FunctionComponent<LogPlotProps> = ({
  series,
  referenceTime,
  yAxisLabel,
}) => {
  const height = 220;
  const data = series.map((s) => ({
    x: s.data.map((d) => d.x - referenceTime),
    y: s.data.map((d) => d.y),
    name: s.label,
    mode: "lines",
    line: {
      color: s.color,
    },
  }));
  const xAxisLabel = "Time (s)";
  return (
    <Plot
      data={data}
      layout={{
        height,
        xaxis: {
          title: xAxisLabel,
        },
        yaxis: {
          title: yAxisLabel,
        },
        margin: {
          l: 50,
          r: 10,
          t: 10,
          b: 50,
        },
        showlegend: true,
      }}
      useResizeHandler={true}
      style={{ width: "100%" }}
    />
  );
};

export default LogPlot;
