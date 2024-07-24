import React, { FunctionComponent, Suspense, useRef } from "react";
import { InView } from "react-intersection-observer";

const Plot = React.lazy(() => import("react-plotly.js"));

type Props = {
  data: any;
  layout: any;
};

export const LazyPlotlyPlotContext = React.createContext<{
  showPlotEvenWhenNotVisible?: boolean;
}>({});

const LazyPlotlyPlot: FunctionComponent<Props> = ({ data, layout }) => {
  // It's important to only show the plot when visible because otherwise, for
  // tab Widgets, the mouse mode of the plotly plot interferes with the other
  // tabs
  const { showPlotEvenWhenNotVisible } = React.useContext(
    LazyPlotlyPlotContext,
  );
  const hasBeenVisible = useRef(false);
  return (
    <InView>
      {({ inView, ref }: { inView: boolean; ref: any }) => {
        if (inView) hasBeenVisible.current = true;
        return (
          <div ref={ref}>
            {inView || !showPlotEvenWhenNotVisible || hasBeenVisible ? (
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
      }}
    </InView>
  );
};

export default LazyPlotlyPlot;
