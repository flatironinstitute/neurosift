import React, { FunctionComponent, Suspense, useRef } from "react";
import { InView, useInView } from "react-intersection-observer";

const Plot = React.lazy(() => import("react-plotly.js"));

type Props = {
  data: any;
  layout: any;
};

export const LazyPlotlyPlotContext = React.createContext<{
  showPlotEvenWhenNotVisible?: boolean;
  showPlotWhenHasBeenVisible?: boolean;
}>({});

const LazyPlotlyPlot: FunctionComponent<Props> = ({ data, layout }) => {
  // It's important to only show the plot when visible because otherwise, for
  // tab Widgets, the mouse mode of the plotly plot interferes with the other
  // tabs
  const { showPlotEvenWhenNotVisible, showPlotWhenHasBeenVisible } =
    React.useContext(LazyPlotlyPlotContext);
  const hasBeenVisible = useRef(false);
  const { ref, inView } = useInView({ trackVisibility: true, delay: 200 });
  console.log("inView: ", inView);
  if (inView) hasBeenVisible.current = true;
  return (
    <div ref={ref}>
      {inView ||
      showPlotEvenWhenNotVisible ||
      (hasBeenVisible && showPlotWhenHasBeenVisible) ? (
        <Suspense fallback={<div>Loading plotly</div>}>
          <Plot data={data} layout={layout} />
        </Suspense>
      ) : (
        <div
          style={{
            position: "relative",
            height: layout.height,
            width: layout.width,
          }}
        ></div>
      )}
    </div>
  );
};

export default LazyPlotlyPlot;
