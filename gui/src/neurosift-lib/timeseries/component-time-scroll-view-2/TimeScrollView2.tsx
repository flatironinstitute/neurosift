import React, {
  FunctionComponent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import TimeseriesSelectionBar, {
  timeSelectionBarHeight,
} from "..//TimeseriesSelectionBar";
import useYAxisTicks from "./YAxisTicks";
import useActionToolbar from "./TimeScrollViewActionsToolbar";
import useTimeScrollEventHandlers, {
  suppressWheelScroll,
} from "./TimeScrollViewEventHandlers";
import { TickSet } from "./YAxisTicks";
import {
  useTimeRange,
  useTimeseriesSelection,
} from "../../contexts/context-timeseries-selection";
import ViewToolbar from "./ViewToolbar";
import { useTimeTicks } from "./timeTicks";
import TSV2AxesLayer from "./TSV2AxesLayer";
import TSV2CursorLayer from "./TSV2CursorLayer";
import Splitter from "../../components/Splitter";
import { ToolbarItem } from "./Toolbars";

const DefaultToolbarWidth = 18;

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
  hideToolbar?: boolean;
  shiftZoom?: boolean;
  yAxisInfo?: {
    showTicks: boolean;
    yMin?: number;
    yMax?: number;
    yLabel?: string;
  };
  additionalToolbarItems?: ToolbarItem[];
  showTimeSelectionBar?: boolean;
  leftMargin?: number;
};

const defaultMargins = {
  left: 45,
  right: 20,
  top: 20,
  bottom: 40,
};

export const useTimeScrollView2 = ({
  width,
  height,
  hideToolbar,
  leftMargin,
}: {
  width: number;
  height: number;
  hideToolbar?: boolean;
  leftMargin?: number;
}) => {
  const margins = useMemo(
    () => ({
      ...defaultMargins,
      left: leftMargin || defaultMargins.left,
    }),
    [leftMargin],
  );
  const toolbarWidth = hideToolbar ? 0 : DefaultToolbarWidth;
  const canvasWidth = width - toolbarWidth;
  const canvasHeight = height;
  return {
    margins,
    canvasWidth,
    canvasHeight,
    toolbarWidth,
  };
};

const TimeScrollView2: FunctionComponent<Props> = ({
  width,
  height,
  onCanvasElement,
  gridlineOpts,
  onKeyDown,
  onMouseDown,
  onMouseMove,
  onMouseOut,
  onMouseUp,
  hideToolbar,
  yAxisInfo,
  shiftZoom,
  additionalToolbarItems,
  showTimeSelectionBar,
  leftMargin,
}) => {
  const {
    visibleStartTimeSec,
    visibleEndTimeSec,
    zoomTimeseriesSelection,
    panTimeseriesSelection,
  } = useTimeRange();
  const { currentTime, currentTimeInterval } = useTimeseriesSelection();
  const timeRange = useMemo(
    () => [visibleStartTimeSec, visibleEndTimeSec] as [number, number],
    [visibleStartTimeSec, visibleEndTimeSec],
  );

  const selectionBarHeight = showTimeSelectionBar ? timeSelectionBarHeight : 0;
  const height2 = height - selectionBarHeight;

  const { margins, canvasWidth, canvasHeight, toolbarWidth } =
    useTimeScrollView2({ width, height: height2, hideToolbar, leftMargin });

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

  const axesLayer = useMemo(() => {
    return (
      <TSV2AxesLayer
        width={canvasWidth}
        height={canvasHeight}
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
    canvasHeight,
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
  const currentTimeIntervalPixels = useMemo(
    () =>
      currentTimeInterval !== undefined
        ? ([
            timeToPixel(currentTimeInterval[0]),
            timeToPixel(currentTimeInterval[1]),
          ] as [number, number])
        : undefined,
    [currentTimeInterval, timeToPixel],
  );

  const cursorLayer = useMemo(() => {
    return (
      <TSV2CursorLayer
        width={canvasWidth}
        height={canvasHeight}
        timeRange={timeRange}
        margins={margins}
        currentTimePixels={currentTimePixels}
        currentTimeIntervalPixels={currentTimeIntervalPixels}
      />
    );
  }, [
    canvasWidth,
    canvasHeight,
    timeRange,
    margins,
    currentTimePixels,
    currentTimeIntervalPixels,
  ]);

  const divRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => suppressWheelScroll(divRef), [divRef]);
  const panelWidthSeconds =
    (visibleEndTimeSec ?? 0) - (visibleStartTimeSec ?? 0);
  // const handleWheel = useTimeScrollZoom(divRef, zoomTimeseriesSelection, {shiftZoom})
  const { handleMouseDown, handleMouseUp, handleMouseLeave, handleMouseMove } =
    useTimeScrollEventHandlers(
      margins.left,
      canvasWidth - margins.left - margins.right,
      panelWidthSeconds,
      divRef,
    );

  const [hoverTime, setHoverTime] = useState<number | undefined>(undefined);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (shiftZoom && !e.shiftKey) return;
      if (e.deltaY === 0) return;
      const zoomsCount = -e.deltaY / 100;
      zoomTimeseriesSelection(zoomsCount > 0 ? "in" : "out", 1.06, hoverTime);
    },
    [shiftZoom, zoomTimeseriesSelection, hoverTime],
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
      onKeyDown && onKeyDown(e);
    },
    [onKeyDown, zoomTimeseriesSelection, panTimeseriesSelection],
  );

  const handleMouseDown2: React.MouseEventHandler = useCallback(
    (e) => {
      if (!e.shiftKey && !e.ctrlKey && !e.altKey) {
        handleMouseDown(e);
      } else {
        onMouseDown && onMouseDown(e);
      }
    },
    [handleMouseDown, onMouseDown],
  );

  const handleMouseUp2: React.MouseEventHandler = useCallback(
    (e) => {
      if (!e.shiftKey && !e.ctrlKey && !e.altKey) {
        handleMouseUp(e);
      } else {
        onMouseUp && onMouseUp(e);
      }
    },
    [handleMouseUp, onMouseUp],
  );

  const handleMouseMove2: React.MouseEventHandler = useCallback(
    (e) => {
      const x = e.clientX - e.currentTarget.getBoundingClientRect().x;
      const t0 = pixelToTime(x);
      setHoverTime(t0);

      if (!e.shiftKey && !e.ctrlKey && !e.altKey) {
        handleMouseMove(e);
      }
      onMouseMove && onMouseMove(e);
    },
    [handleMouseMove, onMouseMove, pixelToTime],
  );

  const handleMouseOut2: React.MouseEventHandler = useCallback(
    (e) => {
      setHoverTime(undefined);
      if (!e.shiftKey && !e.ctrlKey && !e.altKey) {
        handleMouseLeave(e);
      }
      onMouseOut && onMouseOut(e);
    },
    [handleMouseLeave, onMouseOut],
  );

  const content = useMemo(() => {
    return (
      <div
        style={{
          position: "relative",
          overflow: "hidden",
          width: canvasWidth,
          height: canvasHeight,
        }}
        onWheel={handleWheel}
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
            height: canvasHeight,
          }}
          ref={onCanvasElement}
          width={canvasWidth}
          height={canvasHeight}
        />
        {cursorLayer}
      </div>
    );
  }, [
    onCanvasElement,
    axesLayer,
    cursorLayer,
    canvasWidth,
    canvasHeight,
    handleKeyDown,
    handleWheel,
    handleMouseDown2,
    handleMouseUp2,
    handleMouseMove2,
    handleMouseOut2,
  ]);

  const timeControlActions = useActionToolbar({
    belowDefault: additionalToolbarItems,
  });

  const content2 = showTimeSelectionBar ? (
    <div style={{ position: "absolute", width: canvasWidth, height }}>
      <div
        style={{
          position: "absolute",
          width: canvasWidth,
          height: timeSelectionBarHeight,
        }}
      >
        <TimeseriesSelectionBar
          width={canvasWidth}
          height={timeSelectionBarHeight - 5}
        />
      </div>
      <div
        style={{
          position: "absolute",
          top: timeSelectionBarHeight,
          width: canvasWidth,
          height: height - timeSelectionBarHeight,
        }}
      >
        {content}
      </div>
    </div>
  ) : (
    content
  );

  if (hideToolbar) {
    return (
      <div
        ref={divRef}
        style={{ position: "absolute", width, height, background: "white" }}
      >
        {content2}
      </div>
    );
  }

  return (
    <div
      ref={divRef}
      style={{ position: "absolute", width, height, background: "white" }}
    >
      <Splitter
        // ref={divRef} // removed on 2.1.24, let's see if it causes problems
        width={width}
        height={height}
        initialPosition={toolbarWidth}
        adjustable={false}
      >
        <ViewToolbar
          width={0}
          height={0}
          top={showTimeSelectionBar ? timeSelectionBarHeight : 0}
          customActions={timeControlActions}
        />
        {content2}
      </Splitter>
    </div>
  );
};

export default TimeScrollView2;
