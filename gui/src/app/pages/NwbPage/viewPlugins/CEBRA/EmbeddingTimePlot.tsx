import { FunctionComponent, useMemo, useState } from "react";
import LazyPlotlyPlot from "./LazyPlotlyPlot";
import { DimensionsSelector } from "./EmbeddingPlot3D";

type EmbeddingTimePlotProps = {
  embedding: number[][];
  binSizeMsec: number;
  width: number;
  height: number;
};

const EmbeddingTimePlot: FunctionComponent<EmbeddingTimePlotProps> = ({
  embedding,
  binSizeMsec,
  width,
  height,
}) => {
  const numDatapoints = embedding.length;
  const numDimensions = embedding[0].length;
  const dimensionChoices = [...new Array(numDimensions).keys()];
  const [dims, setDims] = useState<{ d1: number; d2: number; d3: number }>({
    d1: 0,
    d2: 1,
    d3: 2,
  });

  const tt = useMemo(() => {
    const t = new Array(numDatapoints)
      .fill(0)
      .map((_, i) => (i * binSizeMsec) / 1000);
    return t;
  }, [numDatapoints, binSizeMsec]);

  const data = useMemo(
    () => [
      {
        x: tt,
        y: embedding.map((row) => row[dims.d1]),
        mode: "lines",
        type: "scatter" as any,
        name: `Dim ${dims.d1}`,
      },
      {
        x: tt,
        y: embedding.map((row) => row[dims.d2]),
        mode: "lines",
        type: "scatter" as any,
        name: `Dim ${dims.d2}`,
      },
      {
        x: tt,
        y: embedding.map((row) => row[dims.d3]),
        mode: "lines",
        type: "scatter" as any,
        name: `Dim ${dims.d3}`,
      },
    ],
    [embedding, dims, tt],
  );

  const layout = useMemo(
    () => ({
      width,
      height: height - 40,
      title: "Embedding over time",
      margin: {
        t: 30,
        b: 40,
        r: 0,
      },
      xaxis: {
        title: "Time (s)",
      },
      yaxis: {
        title: "Value",
      },
    }),
    [width, height],
  );

  return (
    <div style={{ position: "relative", width, height }}>
      <DimensionsSelector
        dims={dims}
        setDims={setDims}
        dimensionChoices={dimensionChoices}
      />
      <LazyPlotlyPlot data={data} layout={layout} />
    </div>
  );
};

export default EmbeddingTimePlot;
