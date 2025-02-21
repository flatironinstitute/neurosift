import { FunctionComponent, useEffect, useMemo, useState } from "react";
import TimeScrollView2 from "@shared/component-time-scroll-view-2/TimeScrollView2";
import { PlotData, PlotOpts, TimeseriesPlotProps as Props } from "./types";

const defaultMargins = {
  left: 50,
  right: 20,
  top: 20,
  bottom: 40,
};

const hideToolbar = true;
const gridlineOpts = { hideX: false, hideY: true };

const TimeseriesPlotTSV2: FunctionComponent<Props> = ({
  width,
  height,
  timestamps,
  data,
  visibleStartTime,
  visibleEndTime,
  channelSeparation,
  zoomInRequired,
}) => {
  const [canvasElement, setCanvasElement] = useState<
    HTMLCanvasElement | undefined
  >();
  const [worker, setWorker] = useState<Worker | null>(null);

  // Initialize worker
  useEffect(() => {
    if (!canvasElement) return;

    const worker = new Worker(
      new URL("./timeseriesPlotTSV2Worker", import.meta.url),
    );
    let offscreenCanvas: OffscreenCanvas;

    try {
      offscreenCanvas = canvasElement.transferControlToOffscreen();
    } catch (err) {
      console.warn(err);
      console.warn(
        "Unable to transfer control to offscreen canvas (expected during dev)",
      );
      return;
    }

    worker.postMessage(
      {
        canvas: offscreenCanvas,
      },
      [offscreenCanvas],
    );

    setWorker(worker);

    return () => {
      worker.terminate();
    };
  }, [canvasElement]);

  // Update plot opts
  useEffect(() => {
    if (!worker) return;

    const plotOpts: PlotOpts = {
      canvasWidth: width,
      canvasHeight: height,
      margins: defaultMargins,
      visibleStartTimeSec: visibleStartTime,
      visibleEndTimeSec: visibleEndTime,
      channelSeparation,
      zoomInRequired,
    };

    worker.postMessage({ plotOpts });
  }, [
    worker,
    width,
    height,
    visibleStartTime,
    visibleEndTime,
    channelSeparation,
    zoomInRequired,
  ]);

  // update plot data
  useEffect(() => {
    if (!worker) return;

    const plotData: PlotData = {
      data,
      timestamps,
    };
    worker.postMessage({ plotData });
  }, [worker, data, timestamps]);

  const [yRange, setYRange] = useState<
    { yMin: number; yMax: number } | undefined
  >(undefined);

  // Listen for worker messages
  useEffect(() => {
    if (!worker) return;
    const handleMessage = (e: MessageEvent) => {
      if (e.data.type === "yAxisRange") {
        setYRange({ yMin: e.data.yMin, yMax: e.data.yMax });
      }
    };
    worker.addEventListener("message", handleMessage);
    return () => {
      worker.removeEventListener("message", handleMessage);
    };
  }, [worker]);

  const yAxisInfo = useMemo(() => {
    const info = {
      showTicks: true,
      yMin: yRange?.yMin,
      yMax: yRange?.yMax,
    };
    return info;
  }, [yRange]);

  return (
    <TimeScrollView2
      width={width}
      height={height}
      onCanvasElement={setCanvasElement}
      gridlineOpts={gridlineOpts}
      yAxisInfo={yAxisInfo}
      hideToolbar={hideToolbar}
    />
  );
};

export default TimeseriesPlotTSV2;
