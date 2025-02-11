import { FunctionComponent, useEffect, useState } from "react";
import TimeScrollView2 from "@shared/component-time-scroll-view-2/TimeScrollView2";
import { TimeseriesPlotProps as Props } from "./types";

const defaultMargins = {
  left: 50,
  right: 20,
  top: 20,
  bottom: 40,
};

const hideToolbar = true;
const gridlineOpts = { hideX: false, hideY: false };

const TimeseriesPlotTSV2: FunctionComponent<Props> = ({
  width,
  height,
  timestamps,
  data,
  visibleStartTime,
  visibleEndTime,
  channelSeparation,
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

  // Update plot when data or view changes
  useEffect(() => {
    if (!worker) return;

    const opts = {
      canvasWidth: width,
      canvasHeight: height,
      margins: defaultMargins,
      visibleStartTimeSec: visibleStartTime,
      visibleEndTimeSec: visibleEndTime,
      channelSeparation,
      data,
      timestamps,
    };

    worker.postMessage({ opts });
  }, [
    worker,
    width,
    height,
    visibleStartTime,
    visibleEndTime,
    channelSeparation,
    data,
    timestamps,
  ]);

  const yAxisInfo = {
    showTicks: true,
    yMin: undefined,
    yMax: undefined,
  };

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
