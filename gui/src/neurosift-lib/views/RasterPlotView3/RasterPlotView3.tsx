/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {
  FunctionComponent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { SpikeTrainsClientType } from "./SpikeTrainsClient";
import { Opts } from "./WorkerTypes";
import {
  useTimeRange,
  useTimeseriesSelectionInitialization,
} from "../../contexts/context-timeseries-selection";
import { useSelectedUnitIds } from "../../contexts/context-unit-selection";
import TimeScrollView2, {
  useTimeScrollView2,
} from "../../timeseries/component-time-scroll-view-2/TimeScrollView2";

type Props = {
  spikeTrainsClient: SpikeTrainsClientType;
  infoMessage?: string;
  width: number;
  height: number;
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

const RasterPlotView3: FunctionComponent<Props> = ({
  spikeTrainsClient,
  width,
  height,
  infoMessage,
}) => {
  const startTimeSec = spikeTrainsClient.startTimeSec!;
  const endTimeSec = spikeTrainsClient.endTimeSec!;
  const hideToolbar = false;
  useTimeseriesSelectionInitialization(startTimeSec, endTimeSec);
  const { visibleStartTimeSec, visibleEndTimeSec } = useTimeRange();

  const [canvasElement, setCanvasElement] = useState<
    HTMLCanvasElement | undefined
  >();
  const [worker, setWorker] = useState<Worker | null>(null);

  const [hoveredUnitId, setHoveredUnitId] = useState<
    string | number | undefined
  >(undefined);

  const { selectedUnitIds, unitIdSelectionDispatch } = useSelectedUnitIds();

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {}, []);

  useEffect(() => {
    if (!canvasElement) return;
    const worker = new Worker(new URL("./worker", import.meta.url));
    const offscreenCanvas = canvasElement.transferControlToOffscreen();
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

  const { blockStartIndex, blockEndIndex, zoomInRequired } = useMemo(() => {
    if (visibleStartTimeSec === undefined || visibleEndTimeSec === undefined) {
      return {
        blockStartIndex: undefined,
        blockEndIndex: undefined,
        zoomInRequired: false,
      };
    }

    const startTimeSec = spikeTrainsClient.startTimeSec!;
    const blockSizeSec = spikeTrainsClient.blockSizeSec!;

    const averageTotalFiringRate =
      spikeTrainsClient.totalNumSpikes! / (endTimeSec - startTimeSec);
    const maxVisibleRange = (60 * 10 * 10 * 100) / averageTotalFiringRate; // 60 seconds * 10 minutes * 10 Hz * 100 units
    // const maxVisibleRange = 60 * 15 * (20 / spikeTrainsClient.unitIds!.length)

    if (visibleEndTimeSec - visibleStartTimeSec > maxVisibleRange) {
      return {
        blockStartIndex: undefined,
        blockEndIndex: undefined,
        zoomInRequired: true,
      };
    }
    const blockStartIndex = Math.floor(
      (visibleStartTimeSec - startTimeSec) / blockSizeSec,
    );
    const blockEndIndex =
      Math.floor((visibleEndTimeSec - startTimeSec) / blockSizeSec) + 1;
    return { blockStartIndex, blockEndIndex, zoomInRequired: false };
  }, [spikeTrainsClient, visibleStartTimeSec, visibleEndTimeSec, endTimeSec]);

  const [loadingMessage, setLoadingMessage] = useState<string | undefined>(
    undefined,
  );

  useEffect(() => {
    let canceled = false;
    if (!worker) return;
    if (blockStartIndex === undefined) return;
    if (blockEndIndex === undefined) return;

    (async () => {
      setLoadingMessage("Loading spike data...");
      const dd = await spikeTrainsClient.getData(
        blockStartIndex,
        blockEndIndex,
        {},
      );
      if (canceled) return;
      const plotData = {
        plots: dd.map((unit) => ({
          unitId: unit.unitId,
          spikeTimesSec: unit.spikeTimesSec,
        })),
      };
      setLoadingMessage("");
      worker.postMessage({
        plotData,
      });
    })();

    return () => {
      canceled = true;
    };
  }, [worker, blockStartIndex, blockEndIndex, spikeTrainsClient]);

  const { canvasWidth, canvasHeight, margins } = useTimeScrollView2({
    width,
    height,
  });

  useEffect(() => {
    if (!worker) return;
    if (visibleStartTimeSec === undefined) return;
    if (visibleEndTimeSec === undefined) return;
    const opts: Opts = {
      canvasWidth,
      canvasHeight,
      margins,
      visibleStartTimeSec,
      visibleEndTimeSec,
      hoveredUnitId,
      selectedUnitIds: [...selectedUnitIds],
      zoomInRequired,
      infoMessage: infoMessage || loadingMessage,
    };
    worker.postMessage({
      opts,
    });
  }, [
    canvasWidth,
    canvasHeight,
    margins,
    visibleStartTimeSec,
    visibleEndTimeSec,
    worker,
    hoveredUnitId,
    selectedUnitIds,
    zoomInRequired,
    infoMessage,
    loadingMessage,
  ]);

  const unitIds = useMemo(
    () => spikeTrainsClient.unitIds!,
    [spikeTrainsClient.unitIds],
  );

  const pixelToUnitId = useCallback(
    (p: { x: number; y: number }) => {
      const numUnits = unitIds.length;
      const frac =
        1 - (p.y - margins.top) / (canvasHeight - margins.top - margins.bottom);
      const index = Math.round(frac * numUnits - 0.5);
      if (0 <= index && index < numUnits) {
        return unitIds[index];
      } else return undefined;
    },
    [canvasHeight, margins, unitIds],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const boundingRect = e.currentTarget.getBoundingClientRect();
      const p = {
        x: e.clientX - boundingRect.x,
        y: e.clientY - boundingRect.y,
      };
      const unitId = pixelToUnitId(p);
      if (e.shiftKey || e.ctrlKey) {
        unitIdSelectionDispatch({ type: "TOGGLE_UNIT", targetUnit: unitId });
      } else {
        unitIdSelectionDispatch({ type: "UNIQUE_SELECT", targetUnit: unitId });
      }
    },
    [pixelToUnitId, unitIdSelectionDispatch],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const boundingRect = e.currentTarget.getBoundingClientRect();
      const p = {
        x: e.clientX - boundingRect.x,
        y: e.clientY - boundingRect.y,
      };
      const unitId = pixelToUnitId(p);
      if (unitId !== undefined) {
        setHoveredUnitId(unitId);
      }
    },
    [pixelToUnitId],
  );

  const handleMouseOut = useCallback((e: React.MouseEvent) => {
    setHoveredUnitId(undefined);
  }, []);

  if (visibleStartTimeSec === undefined) {
    return <div>Loading...</div>;
  }
  return (
    <TimeScrollView2
      width={width}
      height={height}
      onCanvasElement={setCanvasElement}
      gridlineOpts={gridlineOpts}
      onKeyDown={handleKeyDown}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseOut={handleMouseOut}
      hideToolbar={hideToolbar}
      yAxisInfo={yAxisInfo}
      showTimeSelectionBar={true}
    />
  );
};

export default RasterPlotView3;
