import { FunctionComponent, useMemo, useState } from "react";
import Plot from "@components/LazyPlot";
import {
  useTimeAxisRef,
  type AxisInsets,
} from "@shared/context-timeseries-selection-2";
import { panRange, plotInsets } from "./plotlyTimeAxis";
import { Button } from "@ui";
import "./TimeseriesPlot.css";
import { usePlotColors, usePlotTheme } from "@shared/plotTheme";
import { themedLayout } from "@shared/plotlyTheme";
import { traceColors } from "@shared/tracePalette";

import { TimeseriesPlotProps as Props } from "./types";

const TimeseriesPlot: FunctionComponent<Partial<Props>> = ({
  timestamps = [],
  data = [],
  visibleStartTime = 0,
  visibleEndTime = 1,
  channelSeparation = 0,
  channelNames,
  width = 700,
  height = 300,
  zoomInRequired = false,
  onVisibleTimeChange,
}) => {
  const plotColors = usePlotColors();
  const { plotTheme } = usePlotTheme();
  const colors = useMemo(
    () => traceColors(plotColors, plotTheme === "dark"),
    [plotColors, plotTheme],
  );
  const [insets, setInsets] = useState<AxisInsets>({
    left: 50,
    right: 20,
    top: 20,
    bottom: 50,
  });
  const axisRef = useTimeAxisRef(insets);
  const readInsets = (_: unknown, graph: HTMLElement) => {
    const next = plotInsets(graph);
    if (next && JSON.stringify(next) !== JSON.stringify(insets))
      setInsets(next);
  };
  // State for legend visibility
  const [showLegend, setShowLegend] = useState<boolean>(true);

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const plotData: any = useMemo(
    () =>
      separatedChannelData.map((channelValues, i) => ({
        x: timestamps,
        y: channelValues,
        type: "scatter",
        mode: "lines",
        line: {
          color: colors[i % colors.length],
        },
        name: channelNames ? channelNames[i] : `Channel ${i}`,
      })),
    [channelNames, separatedChannelData, timestamps, colors],
  );

  const layout = useMemo(
    () =>
      themedLayout(plotColors, {
        width: width || 700,
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
            font: { size: 14 },
            standoff: 10,
          },
          range: [visibleStartTime, visibleEndTime],
          showticklabels: true,
          showgrid: true,
        },
        yaxis: {
          title: {
            text:
              channelSeparation > 0 ? "Value (channels separated)" : "Value",
            font: { size: 14 },
            standoff: 5,
          },
          showticklabels: true,
          showgrid: true,
          fixedrange: true,
        },
        showlegend: showLegend,
        dragmode: "pan" as const,
      }),
    [
      channelSeparation,
      height,
      visibleEndTime,
      visibleStartTime,
      width,
      showLegend,
      plotColors,
    ],
  );

  const config = useMemo(
    () => ({
      responsive: true,
      displayModeBar: false,
      doubleClick: false as const,
    }),
    [],
  );

  if (zoomInRequired) {
    return (
      <div className="timeseries-plotly-zoom">
        Please zoom in to view the data - current view would load too many
        points
      </div>
    );
  }

  if (!timestamps || !data || data.length === 0) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <div className="timeseries-plotly-legend-toggle">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setShowLegend(!showLegend)}
        >
          {showLegend ? "Hide Legend" : "Show Legend"}
        </Button>
      </div>
      <div ref={axisRef} className="timeseries-plotly">
        <Plot
          data={plotData}
          layout={layout}
          config={config}
          onInitialized={readInsets}
          onUpdate={readInsets}
          onRelayout={(event) => {
            const range = panRange(event);
            if (range) onVisibleTimeChange?.(range[0], range[1]);
          }}
        />
      </div>
    </div>
  );
};

export default TimeseriesPlot;
