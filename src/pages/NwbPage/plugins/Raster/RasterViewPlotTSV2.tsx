import TimeScrollView2 from "@shared/component-time-scroll-view-2/TimeScrollView2";
import { FunctionComponent, useEffect, useMemo, useState } from "react";

type Props = {
  width: number;
  height: number;
  plotData: {
    unitIds: string[];
    spikeTimes: number[][];
    startTime: number;
    duration: number;
    totalNumUnits: number;
  };
};

const defaultMargins = {
  left: 70,
  right: 20,
  top: 20,
  bottom: 40,
};

const RasterViewPlotTSV2: FunctionComponent<Props> = ({
  width,
  height,
  plotData,
}) => {
  const { startTime, duration } = plotData;

  const [canvasElement, setCanvasElement] = useState<
    HTMLCanvasElement | undefined
  >();
  const [worker, setWorker] = useState<Worker | null>(null);

  // Initialize worker
  useEffect(() => {
    if (!canvasElement) return;

    const worker = new Worker(
      new URL("./rasterViewTSV2Worker", import.meta.url),
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

    const plotOpts = {
      canvasWidth: width,
      canvasHeight: height,
      margins: defaultMargins,
      visibleStartTimeSec: startTime,
      visibleEndTimeSec: startTime + duration,
    };

    worker.postMessage({ plotOpts });
  }, [worker, width, height, startTime, duration]);

  // Update plot data
  useEffect(() => {
    if (!worker) return;

    worker.postMessage({
      plotData: {
        unitIds: plotData.unitIds,
        spikeTimes: plotData.spikeTimes,
      },
    });
  }, [worker, plotData.unitIds, plotData.spikeTimes]);

  const yAxisInfo = useMemo(
    () => ({
      showTicks: false,
      yMin: -0.5,
      yMax: plotData.unitIds.length - 0.5,
      yLabel: "Units",
      customYAxisTicks: plotData.unitIds.map((id, i) => ({
        value: i,
        label: `Unit ${id}`,
      })),
    }),
    [plotData.unitIds],
  );

  return (
    <TimeScrollView2
      width={width}
      height={height}
      onCanvasElement={setCanvasElement}
      gridlineOpts={{ hideX: false, hideY: true }}
      yAxisInfo={yAxisInfo}
      hideToolbar
    />
  );
};

export default RasterViewPlotTSV2;
