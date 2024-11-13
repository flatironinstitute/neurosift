import { FunctionComponent, useMemo, useState } from "react";
import LazyPlotlyPlot, { LazyPlotlyPlotContext } from "./LazyPlotlyPlot";

type EmbeddingPlot3DPlotProps = {
  embedding: number[][];
  width: number;
  height: number;
};

const lazyPlotlyPlotContextValue = {
  showPlotEvenWhenNotVisible: true,
};

const EmbeddingPlot3D: FunctionComponent<EmbeddingPlot3DPlotProps> = ({
  embedding,
  width,
  height,
}) => {
  // const numDatapoints = embedding.length
  const numDimensions = embedding[0].length;
  const dimensionChoices = [...new Array(numDimensions).keys()];
  const [dims, setDims] = useState<{ d1: number; d2: number; d3: number }>({
    d1: 0,
    d2: 1,
    d3: 2,
  });

  const data = useMemo(
    () => [
      {
        x: embedding.map((row) => row[dims.d1]),
        y: embedding.map((row) => row[dims.d2]),
        z: embedding.map((row) => row[dims.d3]),
        mode: "markers",
        type: "scatter3d" as any,
        marker: {
          size: 1,
          opacity: 0.8,
        },
      },
    ],
    [embedding, dims],
  );
  const layout = useMemo(
    () => ({
      width,
      height: height - 40,
      title: "Embedding",
      margin: {
        t: 30,
        b: 40,
        r: 0,
      },
      scene: {
        xaxis: {
          title: `Dim ${dims.d1}`,
        },
        yaxis: {
          title: `Dim ${dims.d2}`,
        },
        zaxis: {
          title: `Dim ${dims.d3}`,
        },
      },
    }),
    [dims, width, height],
  );

  return (
    <LazyPlotlyPlotContext.Provider value={lazyPlotlyPlotContextValue}>
      <div style={{ position: "relative", width, height }}>
        <DimensionsSelector
          dims={dims}
          setDims={setDims}
          dimensionChoices={dimensionChoices}
        />
        <LazyPlotlyPlot data={data} layout={layout} />
      </div>
    </LazyPlotlyPlotContext.Provider>
  );
};

type DimensionsSelectorProps = {
  dims: { d1: number; d2: number; d3: number };
  setDims: (dims: { d1: number; d2: number; d3: number }) => void;
  dimensionChoices: number[];
};

export const DimensionsSelector: FunctionComponent<DimensionsSelectorProps> = ({
  dims,
  setDims,
  dimensionChoices,
}) => {
  return (
    <div>
      <select
        value={dims.d1}
        onChange={(e) => {
          const d1 = parseInt(e.target.value);
          if (d1 === dims.d2) {
            setDims({ d1: d1, d2: dims.d1, d3: dims.d3 });
          } else if (d1 === dims.d3) {
            setDims({ d1: d1, d2: dims.d2, d3: dims.d1 });
          } else {
            setDims({ d1, d2: dims.d2, d3: dims.d3 });
          }
        }}
      >
        {dimensionChoices.map((d) => (
          <option key={d} value={d}>{`Dim ${d}`}</option>
        ))}
      </select>
      <select
        value={dims.d2}
        onChange={(e) => {
          const d2 = parseInt(e.target.value);
          if (d2 === dims.d1) {
            setDims({ d1: dims.d2, d2: d2, d3: dims.d3 });
          } else if (d2 === dims.d3) {
            setDims({ d1: dims.d1, d2: d2, d3: dims.d2 });
          } else {
            setDims({ d1: dims.d1, d2, d3: dims.d3 });
          }
        }}
      >
        {dimensionChoices.map((d) => (
          <option key={d} value={d}>{`Dim ${d}`}</option>
        ))}
      </select>
      <select
        value={dims.d3}
        onChange={(e) => {
          const d3 = parseInt(e.target.value);
          if (d3 === dims.d1) {
            setDims({ d1: dims.d2, d2: dims.d3, d3: d3 });
          } else if (d3 === dims.d2) {
            setDims({ d1: dims.d1, d2: dims.d3, d3: d3 });
          } else {
            setDims({ d1: dims.d1, d2: dims.d2, d3 });
          }
        }}
      >
        {dimensionChoices.map((d) => (
          <option key={d} value={d}>{`Dim ${d}`}</option>
        ))}
      </select>
    </div>
  );
};

export default EmbeddingPlot3D;
