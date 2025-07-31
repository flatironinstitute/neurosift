import { Splitter } from "@fi-sci/splitter";
import {
  useTimeRange,
  useTimeseriesSelection,
} from "@shared/context-timeseries-selection-2";
import TimeseriesSelectionBar, {
  timeSelectionBarHeight,
} from "@shared/TimeseriesSelectionBar/TimeseriesSelectionBar";
import React, {
  CSSProperties,
  FunctionComponent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import useActionToolbar from "./TimeScrollViewActionsToolbar";
import { suppressWheelScroll } from "./TimeScrollViewEventHandlers";
import { useTimeTicks } from "./timeTicks";
import { ToolbarItem } from "./Toolbars";
import TSV2AxesLayer from "./TSV2AxesLayer";
import TSV2CursorLayer from "./TSV2CursorLayer";
import ViewToolbar from "./ViewToolbar";
import useYAxisTicks, { TickSet } from "./YAxisTicks";

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
  showTimeseriesToolbar?: boolean; // // this is tricky... hideToolbar removes the space for the toolbar, whereas showTimeseriesToolbar=false just hides the toolbar
  shiftZoom?: boolean;
  requireClickToZoom?: boolean; // Whether mouse wheel zoom requires clicking in the view first (default: true)
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
  left: 50,
  right: 20,
  top: 20,
  bottom: 40,
};

export const useTimeScrollView3 = ({
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
  hideToolbar,
  showTimeseriesToolbar,
  yAxisInfo,
  shiftZoom,
  requireClickToZoom,
  additionalToolbarItems,
  showTimeSelectionBar,
  leftMargin,
}) => {
  const {
    visibleStartTimeSec,
    visibleEndTimeSec,
    zoomTimeseriesSelection,
    panTimeseriesSelection,
    panTimeseriesSelectionVisibleStartTimeSec,
  } = useTimeRange();
  // const { currentTime, currentTimeInterval } = useTimeseriesSelection();
  const { currentTime, setCurrentTime } = useTimeseriesSelection();
  const timeRange = useMemo(
    () => [visibleStartTimeSec, visibleEndTimeSec] as [number, number],
    [visibleStartTimeSec, visibleEndTimeSec],
  );

  const selectionBarHeight = showTimeSelectionBar ? timeSelectionBarHeight : 0;
  const height2 = height - selectionBarHeight;

  const { margins, canvasWidth, canvasHeight, toolbarWidth } =
    useTimeScrollView3({ width, height: height2, hideToolbar, leftMargin });

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

  // const currentTimeIntervalPixels = useMemo(
  //   () =>
  //     currentTimeInterval !== undefined
  //       ? ([
  //           timeToPixel(currentTimeInterval[0]),
  //           timeToPixel(currentTimeInterval[1]),
  //         ] as [number, number])
  //       : undefined,
  //   [currentTimeInterval, timeToPixel],
  // );

  const cursorLayer = useMemo(() => {
    return (
      <TSV2CursorLayer
        width={canvasWidth}
        height={canvasHeight}
        timeRange={timeRange}
        margins={margins}
        currentTimePixels={currentTimePixels}
        // currentTimeIntervalPixels={currentTimeIntervalPixels}
      />
    );
  }, [
    canvasWidth,
    canvasHeight,
    timeRange,
    margins,
    currentTimePixels,
    // currentTimeIntervalPixels,
  ]);

  const [isViewClicked, setIsViewClicked] = useState(false);

  const divRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const allowWheelZoom = requireClickToZoom === false || isViewClicked;
    if (allowWheelZoom) {
      suppressWheelScroll(divRef);
    }
  }, [requireClickToZoom, isViewClicked]);

  // const panelWidthSeconds =
  //   (visibleEndTimeSec ?? 0) - (visibleStartTimeSec ?? 0);
  // const handleWheel = useTimeScrollZoom(divRef, zoomTimeseriesSelection, {shiftZoom})
  // const { handleMouseDown, handleMouseUp, handleMouseLeave, handleMouseMove } =
  //   useTimeScrollEventHandlers(
  //     margins.left,
  //     canvasWidth - margins.left - margins.right,
  //     panelWidthSeconds,
  //     divRef,
  //   );

  const [hoverTime, setHoverTime] = useState<number | undefined>(undefined);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (shiftZoom && !e.shiftKey) return;
      if (e.deltaY === 0) return;
      if (requireClickToZoom !== false && !isViewClicked) return;
      const zoomsCount = -e.deltaY / 100;
      zoomTimeseriesSelection(zoomsCount > 0 ? "in" : "out", 1.1, hoverTime);
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

  const mouseData = useRef<{
    mouseDownAchorX: number | null;
    mouseDownAnchorTime: number | null;
    mouseDownAnchorVisibleStartTime: number | null;
    mouseDownAnchorPixelToTime: ((x: number) => number) | null;
    moved: boolean;
  }>({
    mouseDownAchorX: null,
    mouseDownAnchorTime: null,
    mouseDownAnchorVisibleStartTime: null,
    mouseDownAnchorPixelToTime: null,
    moved: false,
  });

  const handleMouseDown2: React.MouseEventHandler = useCallback(
    (e) => {
      setIsViewClicked(true);
      if (!e.shiftKey && !e.ctrlKey && !e.altKey) {
        mouseData.current.mouseDownAchorX =
          e.clientX - e.currentTarget.getBoundingClientRect().x;
        mouseData.current.mouseDownAnchorTime = pixelToTime(
          mouseData.current.mouseDownAchorX,
        );
        mouseData.current.mouseDownAnchorVisibleStartTime =
          visibleStartTimeSec || null;
        mouseData.current.mouseDownAnchorPixelToTime = pixelToTime;
        mouseData.current.moved = false; // Reset moved state on mouse down
      } else {
        if (onMouseDown) onMouseDown(e);
      }
    },
    [pixelToTime, onMouseDown, visibleStartTimeSec],
  );

  const handleMouseUp2: React.MouseEventHandler = useCallback(
    (e) => {
      if (!e.shiftKey && !e.ctrlKey && !e.altKey) {
        mouseData.current.mouseDownAchorX = null;
        mouseData.current.mouseDownAnchorTime = null;
        mouseData.current.mouseDownAnchorPixelToTime = null;
        if (!mouseData.current.moved) {
          // If the mouse did not move, consider it a click
          const x = e.clientX - e.currentTarget.getBoundingClientRect().x;
          const t0 = pixelToTime(x);
          setCurrentTime(t0);
        }
      } else {
        if (onMouseUp) onMouseUp(e);
      }
    },
    [onMouseUp, pixelToTime, setCurrentTime],
  );

  const handleMouseMove2: React.MouseEventHandler = useCallback(
    (e) => {
      const x = e.clientX - e.currentTarget.getBoundingClientRect().x;
      const t0 = pixelToTime(x);
      setHoverTime(t0);

      if (!e.shiftKey && !e.ctrlKey && !e.altKey) {
        if (
          mouseData.current.mouseDownAchorX !== null &&
          mouseData.current.mouseDownAnchorPixelToTime !== null
        ) {
          const currentX =
            e.clientX - e.currentTarget.getBoundingClientRect().x;
          const currentTime =
            mouseData.current.mouseDownAnchorPixelToTime(currentX);
          const anchorTime = mouseData.current.mouseDownAnchorTime;
          const anchorVisibleStartTime =
            mouseData.current.mouseDownAnchorVisibleStartTime;
          if (anchorTime !== null && anchorVisibleStartTime !== null) {
            const deltaTime = currentTime - anchorTime;
            const deltaX = currentX - mouseData.current.mouseDownAchorX;
            if (Math.abs(deltaX) > 2 || Math.abs(deltaTime) > 0.01) {
              const newVisibleStartTime = anchorVisibleStartTime - deltaTime;
              panTimeseriesSelectionVisibleStartTimeSec(newVisibleStartTime);
              e.preventDefault(); // Prevent default scrolling behavior
              e.stopPropagation(); // Stop the event from propagating further
              mouseData.current.moved = true; // Mark that the mouse has moved
            }
          }
        }
      }
      if (onMouseMove) onMouseMove(e);
    },
    [pixelToTime, onMouseMove, panTimeseriesSelectionVisibleStartTimeSec],
  );

  const handleMouseOut2: React.MouseEventHandler = useCallback(
    (e) => {
      setHoverTime(undefined);
      setIsViewClicked(false);
      // if (!e.shiftKey && !e.ctrlKey && !e.altKey) {
      //   mouseData.current.mouseDownAchorX = null;
      //   mouseData.current.mouseDownAnchorTime = null;
      // }
      if (onMouseOut) onMouseOut(e);
    },
    [onMouseOut],
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
    requireClickToZoom,
    isViewClicked,
  ]);

  const timeControlActions = useActionToolbar({
    belowDefault: additionalToolbarItems,
  });

  const content2Style: CSSProperties = useMemo(
    () => ({
      position: "absolute",
      width: canvasWidth,
      height: timeSelectionBarHeight,
    }),
    [canvasWidth],
  );

  const contentStyle: CSSProperties = useMemo(
    () => ({
      position: "absolute",
      top: timeSelectionBarHeight,
      width: canvasWidth,
      height: canvasHeight - timeSelectionBarHeight,
    }),
    [canvasWidth, canvasHeight],
  );

  const content2 = showTimeSelectionBar ? (
    <div style={content2Style}>
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
      <div style={contentStyle}>{content}</div>
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
      style={{ position: "relative", width, height, background: "white" }}
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
          actuallyHideIt={showTimeseriesToolbar === false} // sorry :)
        />
        {content2}
      </Splitter>
    </div>
  );
};

export default TimeScrollView3;
