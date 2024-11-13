import { FunctionComponent, useEffect, useMemo, useState } from "react";
import TimeScrollView2, {
  useTimeScrollView2,
} from "../../timeseries/component-time-scroll-view-2/TimeScrollView2";
import {
  useTimeRange,
  useTimeseriesSelectionInitialization,
} from "../../contexts/context-timeseries-selection";
import { timeSelectionBarHeight } from "../../timeseries/TimeseriesSelectionBar";

type Props = {
  width: number;
  height: number;
  labels: string[] | undefined;
  startTimes: number[];
  stopTimes: number[];
};

const gridlineOpts = {
  hideX: false,
  hideY: true,
};

const yAxisInfo = {
  showTicks: false,
  yMin: undefined,
  yMax: undefined,
};

const hideToolbar = false;

const NwbTimeIntervalsWidget: FunctionComponent<Props> = ({
  width,
  height,
  labels,
  startTimes,
  stopTimes,
}) => {
  const [canvasElement, setCanvasElement] = useState<
    HTMLCanvasElement | undefined
  >();

  const { startTime, endTime } = useMemo(() => {
    let startTime = Number.MAX_VALUE;
    let endTime = Number.MIN_VALUE;
    for (let i = 0; i < startTimes.length; i++) {
      if (!isNaN(startTimes[i])) startTime = Math.min(startTime, startTimes[i]);
      if (!isNaN(stopTimes[i])) endTime = Math.max(endTime, stopTimes[i]);
    }
    return { startTime, endTime };
  }, [startTimes, stopTimes]);

  useTimeseriesSelectionInitialization(startTime, endTime);
  const { visibleStartTimeSec, visibleEndTimeSec } = useTimeRange();

  const { canvasWidth, canvasHeight, margins } = useTimeScrollView2({
    width,
    height: height - timeSelectionBarHeight,
    hideToolbar,
  });

  const timeToPixel = useMemo(
    () => (t: number) => {
      if (visibleStartTimeSec === undefined) return 0;
      if (visibleEndTimeSec === undefined) return 0;
      return (
        margins.left +
        ((t - visibleStartTimeSec) /
          (visibleEndTimeSec - visibleStartTimeSec)) *
          (canvasWidth - margins.left - margins.right)
      );
    },
    [
      visibleStartTimeSec,
      visibleEndTimeSec,
      canvasWidth,
      margins.left,
      margins.right,
    ],
  );

  const distinctLabels = useMemo(() => {
    if (!labels) return [];
    const ret: string[] = [];
    for (let i = 0; i < labels.length; i++) {
      if (!ret.includes(labels[i])) ret.push(labels[i]);
    }
    return ret.sort();
  }, [labels]);

  const colorForLabel = useMemo(
    () => (label: string) => {
      const index = distinctLabels.indexOf(label);
      return lightColors[index % lightColors.length];
    },
    [distinctLabels],
  );

  const fracPositionForLabel = useMemo(
    () => (label: string) => {
      const index = distinctLabels.indexOf(label);
      return (index + 0.5) / distinctLabels.length;
    },
    [distinctLabels],
  );

  useEffect(() => {
    if (!canvasElement) return;
    if (visibleStartTimeSec === undefined) return;
    if (visibleEndTimeSec === undefined) return;
    const ctx = canvasElement.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    const y1 = margins.top + 20;
    const y2 = canvasHeight - margins.bottom - 20;

    let timer = Date.now();

    let canceled = false;

    (async () => {
      for (const pass of [1, 2]) {
        for (let i = 0; i < startTimes.length; i++) {
          const elapsed = Date.now() - timer;
          if (elapsed > 20) {
            // take a break so we don't block the UI
            await new Promise((r) => setTimeout(r, 1));
            timer = Date.now();
          }
          if (canceled) return;
          const x1 = timeToPixel(startTimes[i]);
          const x2 = timeToPixel(stopTimes[i]);

          if (x2 < 0) continue;
          if (x1 > canvasWidth) continue;

          const rect = [x1, y1, x2 - x1, y2 - y1];

          if (pass === 1) {
            ctx.fillStyle = labels ? colorForLabel(labels[i]) : "gray";
            ctx.fillRect(rect[0], rect[1], rect[2], rect[3]);
          }

          if (pass === 2 && labels) {
            // draw text in the center mid of the rect
            const text = labels[i];
            ctx.textBaseline = "middle";
            ctx.textAlign = "center";
            ctx.fillStyle = "black";
            ctx.font = `16px sans-serif`;
            const yPos = y1 + (y2 - y1) * fracPositionForLabel(labels[i]);
            ctx.fillText(text, rect[0] + rect[2] / 2, yPos);
          }
        }
      }
    })();

    return () => {
      canceled = true;
    };
  }, [
    canvasElement,
    canvasWidth,
    canvasHeight,
    visibleStartTimeSec,
    visibleEndTimeSec,
    startTimes,
    stopTimes,
    timeToPixel,
    margins,
    labels,
    colorForLabel,
    fracPositionForLabel,
  ]);

  return (
    <TimeScrollView2
      width={width}
      height={height}
      onCanvasElement={setCanvasElement}
      gridlineOpts={gridlineOpts}
      yAxisInfo={yAxisInfo}
      hideToolbar={hideToolbar}
      showTimeSelectionBar={true}
    />
  );
};

const lightColors: string[] = [
  "#afa",
  "#faf",
  "#0af",
  "#fa0",
  "#ffa",
  "#aff",
  "#f0f",
  "#ff0",
  "#0ff",
  "#faa",
  "#aaf",
];

export default NwbTimeIntervalsWidget;
