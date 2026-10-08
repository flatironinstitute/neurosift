import { lazy, Suspense } from "react";
import type { PlotParams } from "react-plotly.js";

// Plotly is several megabytes. Importing it here, and nowhere else, keeps it
// in its own chunk that is fetched the first time a Plotly plot is shown.
const Plot = lazy(() => import("react-plotly.js"));

const LazyPlot = (props: PlotParams) => (
  <Suspense fallback={<div style={props.style} className={props.className} />}>
    <Plot {...props} />
  </Suspense>
);

export default LazyPlot;
