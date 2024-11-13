import { FunctionComponent, useMemo } from "react";
import LazyPlotlyPlot from "./LazyPlotlyPlot";

type LossPlotPlotProps = {
  loss: number[];
  width: number;
  height: number;
};

const LossPlot: FunctionComponent<LossPlotPlotProps> = ({
  loss,
  width,
  height,
}) => {
  const data = useMemo(
    () => [
      {
        x: [...new Array(loss.length).keys()].map((i) => i + 1),
        y: loss,
        type: "scatter" as any,
        mode: "lines+markers",
        marker: { color: "blue" },
      },
    ],
    [loss],
  );
  const layout = useMemo(
    () => ({
      width: 800,
      height: 400,
      title: "Loss",
      yaxis: { title: "loss" },
      xaxis: { title: "iteration" },
      margin: {
        t: 30,
        b: 40,
        r: 0,
      },
      showlegend: false,
    }),
    [],
  );
  return (
    <div style={{ position: "relative", width, height }}>
      <LazyPlotlyPlot data={data} layout={layout} />
    </div>
  );
};

export default LossPlot;
