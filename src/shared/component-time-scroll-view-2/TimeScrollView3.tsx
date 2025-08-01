import {
  useTimeRange,
  useTimeseriesSelection,
} from "@shared/context-timeseries-selection-2";
import React, {
  FunctionComponent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { suppressWheelScroll } from "./TimeScrollViewEventHandlers";
import { useTimeTicks } from "./timeTicks";
import TSV2AxesLayer from "./TSV2AxesLayer";
import TSV2CursorLayer from "./TSV2CursorLayer";
import TSV2SelectionLayer from "./TSV2SelectionLayer";
import useTimeScrollMouseWithModes from "./useTimeScrollMouseWithModes";
import { useTimeScrollView3 } from "./useTimeScrollView3";
import useYAxisTicks, { TickSet } from "./YAxisTicks";
import TimeScrollToolbar, {
  InteractionMode,
  CustomToolbarAction,
} from "./TimeScrollToolbar";
import CustomActionsToolbar from "./CustomActionsToolbar";

type Props = {
  width: number;
  height: number;
  onCanvasElement: (elmt: HTMLCanvasElement) => void;
  gridlineOpts?: { hideX: boolean; hideY: boolean };
  onKeyDown?: (e: React.KeyboardEvent) => void;
  onMouseDown?: (e: React.MouseEvent) => void;
  onMouseUp?: (e: React.MouseEvent) => void;
  onMouseMove?: (e: React.MouseEvent) => void;
  onMouseOut?: (e: React.MouseEvent) => void;
  shiftZoom?: boolean;
  requireClickToZoom?: boolean; // Whether mouse wheel zoom requires clicking in the view first (default: true)
  yAxisInfo?: {
    showTicks: boolean;
    yMin?: number;
    yMax?: number;
    yLabel?: string;
  };
  leftMargin?: number;
  customToolbarActions?: CustomToolbarAction[];
  onCanvasClick?: (x: number, y: number) => void;
};

const TimeScrollView3: FunctionComponent<Props> = ({
  width,
  height,
  onCanvasElement,
  gridlineOpts,
  onKeyDown,
  onMouseDown,
  onMouseMove,
  onMouseOut,
  onMouseUp,
  yAxisInfo,
  shiftZoom,
  requireClickToZoom,
  leftMargin,
  customToolbarActions,
  onCanvasClick,
}) => {
  const {
    visibleStartTimeSec,
    visibleEndTimeSec,
    zoomTimeseriesSelection,
    panTimeseriesSelection,
    setVisibleTimeRange,
  } = useTimeRange();
  const { currentTime, setCurrentTime, startTimeSec, endTimeSec } =
    useTimeseriesSelection();
  const timeRange = useMemo(
    () => [visibleStartTimeSec, visibleEndTimeSec] as [number, number],
    [visibleStartTimeSec, visibleEndTimeSec],
  );

  const { margins, canvasWidth, canvasHeight } = useTimeScrollView3({
    width,
    height,
    leftMargin,
    hasCustomActions: customToolbarActions && customToolbarActions.length > 0,
  });

  const timeToPixel = useMemo(() => {
    if (visibleStartTimeSec === undefined || visibleEndTimeSec === undefined)
      return () => 0;
    if (visibleEndTimeSec <= visibleStartTimeSec) return () => 0;
    return (t: number) =>
      margins.left +
      ((t - visibleStartTimeSec) / (visibleEndTimeSec - visibleStartTimeSec)) *
        (canvasWidth - margins.left - margins.right);
  }, [canvasWidth, visibleStartTimeSec, visibleEndTimeSec, margins]);

  const pixelToTime = useMemo(() => {
    if (visibleStartTimeSec === undefined || visibleEndTimeSec === undefined)
      return () => 0;
    if (visibleEndTimeSec <= visibleStartTimeSec) return () => 0;
    return (x: number) =>
      visibleStartTimeSec +
      ((x - margins.left) / (canvasWidth - margins.left - margins.right)) *
        (visibleEndTimeSec - visibleStartTimeSec);
  }, [canvasWidth, visibleStartTimeSec, visibleEndTimeSec, margins]);

  const yToPixel = useMemo(() => {
    const y0 = yAxisInfo?.yMin || 0;
    const y1 = yAxisInfo?.yMax || 0;
    if (y1 <= y0) return () => 0;
    return (y: number) =>
      canvasHeight -
      margins.bottom -
      ((y - y0) / (y1 - y0)) * (canvasHeight - margins.top - margins.bottom);
  }, [yAxisInfo, canvasHeight, margins]);

  const timeTicks = useTimeTicks(
    canvasWidth,
    visibleStartTimeSec,
    visibleEndTimeSec,
    timeToPixel,
  );

  const yTicks = useYAxisTicks({
    datamin: yAxisInfo?.yMin || 0,
    datamax: yAxisInfo?.yMax || 0,
    pixelHeight: canvasHeight - margins.left - margins.right,
  });
  const yTickSet: TickSet = useMemo(
    () => ({
      datamin: yTicks.datamin,
      datamax: yTicks.datamax,
      ticks: yTicks.ticks.map((t) => ({
        ...t,
        pixelValue: yToPixel(t.dataValue),
      })),
    }),
    [yTicks, yToPixel],
  );

  const plotHeight = canvasHeight;

  const axesLayer = useMemo(() => {
    return (
      <TSV2AxesLayer
        width={canvasWidth}
        height={plotHeight}
        timeRange={timeRange}
        margins={margins}
        timeTicks={timeTicks}
        yTickSet={yAxisInfo?.showTicks ? yTickSet : undefined}
        yLabel={yAxisInfo?.yLabel}
        gridlineOpts={gridlineOpts}
      />
    );
  }, [
    gridlineOpts,
    canvasWidth,
    plotHeight,
    timeRange,
    margins,
    timeTicks,
    yAxisInfo?.showTicks,
    yAxisInfo?.yLabel,
    yTickSet,
  ]);

  const currentTimePixels = useMemo(
    () => (currentTime !== undefined ? timeToPixel(currentTime) : undefined),
    [currentTime, timeToPixel],
  );

  const cursorLayer = useMemo(() => {
    return (
      <TSV2CursorLayer
        width={canvasWidth}
        height={plotHeight}
        timeRange={timeRange}
        margins={margins}
        currentTimePixels={currentTimePixels}
        // currentTimeIntervalPixels={currentTimeIntervalPixels}
      />
    );
  }, [
    canvasWidth,
    plotHeight,
    timeRange,
    margins,
    currentTimePixels,
    // currentTimeIntervalPixels,
  ]);

  const divRef = useRef<HTMLDivElement | null>(null);
  const [interactionMode, setInteractionMode] =
    useState<InteractionMode>("pan");

  const {
    isViewClicked,
    hoverTime,
    selectionRect,
    handleMouseDown: handleMouseDown2,
    handleMouseUp: handleMouseUp2,
    handleMouseMove: handleMouseMove2,
    handleMouseOut: handleMouseOut2,
  } = useTimeScrollMouseWithModes({
    pixelToTime,
    visibleStartTimeSec,
    setCurrentTime,
    onMouseDown,
    onMouseUp,
    onMouseMove,
    onMouseOut,
    onCanvasClick,
    interactionMode,
  });

  useEffect(() => {
    const allowWheelZoom = requireClickToZoom === false || isViewClicked;
    if (allowWheelZoom) {
      suppressWheelScroll(divRef);
    }
  }, [requireClickToZoom, isViewClicked]);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (shiftZoom && !e.shiftKey) return;
      if (e.deltaY === 0) return;
      if (requireClickToZoom !== false && !isViewClicked) return;
      const zoomsCount = -e.deltaY / 100;
      zoomTimeseriesSelection(zoomsCount > 0 ? "in" : "out", 1.2, hoverTime);
    },
    [
      shiftZoom,
      zoomTimeseriesSelection,
      hoverTime,
      requireClickToZoom,
      isViewClicked,
    ],
  );

  const handleKeyDown: React.KeyboardEventHandler = useCallback(
    (e) => {
      if (e.key === "=") {
        zoomTimeseriesSelection("in");
      } else if (e.key === "-") {
        zoomTimeseriesSelection("out");
      } else if (e.key === "ArrowRight") {
        panTimeseriesSelection("forward");
      } else if (e.key === "ArrowLeft") {
        panTimeseriesSelection("back");
      }
      if (onKeyDown) onKeyDown(e);
    },
    [onKeyDown, zoomTimeseriesSelection, panTimeseriesSelection],
  );

  const handleZoomToFit = useCallback(() => {
    if (startTimeSec !== undefined && endTimeSec !== undefined) {
      setVisibleTimeRange(startTimeSec, endTimeSec);
    }
  }, [startTimeSec, endTimeSec, setVisibleTimeRange]);

  const selectionLayer = useMemo(() => {
    return (
      <TSV2SelectionLayer
        width={canvasWidth}
        height={plotHeight}
        selectionRect={selectionRect}
      />
    );
  }, [canvasWidth, plotHeight, selectionRect]);

  const content = useMemo(() => {
    return (
      <div
        style={{
          position: "relative",
          overflow: "hidden",
          width: canvasWidth,
          height: plotHeight,
        }}
        onWheel={!requireClickToZoom || isViewClicked ? handleWheel : undefined}
        onMouseDown={handleMouseDown2}
        onMouseUp={handleMouseUp2}
        onMouseMove={handleMouseMove2}
        onMouseOut={handleMouseOut2}
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        {axesLayer}
        <canvas
          style={{
            position: "absolute",
            width: canvasWidth,
            height: plotHeight,
          }}
          ref={onCanvasElement}
          width={canvasWidth}
          height={plotHeight}
        />
        {cursorLayer}
        {selectionLayer}
      </div>
    );
  }, [
    onCanvasElement,
    axesLayer,
    cursorLayer,
    selectionLayer,
    canvasWidth,
    plotHeight,
    handleKeyDown,
    handleWheel,
    handleMouseDown2,
    handleMouseUp2,
    handleMouseMove2,
    handleMouseOut2,
    requireClickToZoom,
    isViewClicked,
  ]);

  const timeScrollToolbar = useMemo(() => {
    return (
      <TimeScrollToolbar
        width={width}
        height={40}
        interactionMode={interactionMode}
        onInteractionModeChange={setInteractionMode}
        currentTime={currentTime}
        onZoomToFit={handleZoomToFit}
      />
    );
  }, [
    width,
    interactionMode,
    setInteractionMode,
    currentTime,
    handleZoomToFit,
  ]);

  const customActionsToolbar = useMemo(() => {
    return (
      <CustomActionsToolbar
        width={width}
        height={40}
        customActions={customToolbarActions}
      />
    );
  }, [width, customToolbarActions]);

  return (
    <div
      className="time-scroll-view-3"
      ref={divRef}
      style={{ position: "absolute", width, height, background: "white" }}
    >
      {content}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0 }}>
        {timeScrollToolbar}
        {customActionsToolbar}
      </div>
    </div>
  );
};

export default TimeScrollView3;
