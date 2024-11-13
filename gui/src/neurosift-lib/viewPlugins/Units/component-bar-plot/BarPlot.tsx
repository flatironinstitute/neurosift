import { BaseCanvas } from "../view-average-waveforms/WaveformWidget/sharedDrawnComponents/figurl-canvas";
import {
  Vec2,
  Vec4,
} from "../view-average-waveforms/WaveformWidget/sharedDrawnComponents/figurl-canvas";
import { FunctionComponent, useCallback, useMemo } from "react";
import BarPlotMainLayer, {
  BarBox,
  BarPlotTick,
  BarPlotVerticalLine,
} from "./BarPlotMainLayer";
import { useDragSelectLayer } from "../drag-select";

export type BarPlotBar = {
  key: string | number;
  xStart: number;
  xEnd: number;
  height: number;
  tooltip: string;
  color: string;
};

type Props = {
  width: number;
  height: number;
  bars: BarPlotBar[];
  ticks?: BarPlotTick[];
  verticalLines?: BarPlotVerticalLine[];
  xLabel?: string;
  onSelectRect?: (
    r: { x: number; y: number; width: number; height: number },
    selectedBarKeys: (string | number)[],
    o: { ctrlKey: boolean; shiftKey: boolean },
  ) => void;
};

export type Margins = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

const emptyDrawData = {};

const BarPlot: FunctionComponent<Props> = ({
  bars,
  ticks,
  verticalLines,
  xLabel,
  onSelectRect,
  width,
  height,
}) => {
  const { xMin, xMax } = useMemo(
    () =>
      bars.length > 0
        ? { xMin: bars[0].xStart, xMax: bars[bars.length - 1].xEnd }
        : { xMin: 0, xMax: 1 },
    [bars],
  );
  const yMax = useMemo(() => Math.max(...bars.map((b) => b.height)), [bars]);

  const {
    barBoxes,
    margins,
    pixelTicks,
    pixelVerticalLines,
  }: {
    barBoxes: BarBox[];
    margins: Margins;
    pixelTicks?: BarPlotTick[];
    pixelVerticalLines?: BarPlotVerticalLine[];
  } = useMemo(() => {
    const margins = {
      left: 3,
      right: 3,
      top: 5,
      bottom: 3 + (xLabel ? 13 : 0) + (ticks ? 13 : 0),
    };
    const W = width - margins.left - margins.right;
    const H = height - margins.top - margins.bottom;
    const barBoxes = bars.map((bar) => ({
      key: bar.key,
      x1: margins.left + ((bar.xStart - xMin) / (xMax - xMin)) * W,
      x2: margins.left + ((bar.xEnd - xMin) / (xMax - xMin)) * W,
      y1: margins.top + H * (1 - bar.height / yMax),
      y2: margins.top + H,
      tooltip: bar.tooltip,
      color: bar.color,
    }));
    const pixelTicks = ticks
      ? ticks.map((tick) => ({
          x: margins.left + ((tick.x - xMin) / (xMax - xMin)) * W,
          label: `${tick.label}`,
        }))
      : undefined;
    const pixelVerticalLines = verticalLines
      ? verticalLines.map((v) => ({
          x: margins.left + ((v.x - xMin) / (xMax - xMin)) * W,
          color: v.color,
        }))
      : undefined;
    return { barBoxes, margins, pixelTicks, pixelVerticalLines };
  }, [bars, ticks, verticalLines, xMin, xMax, yMax, width, height, xLabel]);

  const handleSelectRect = useCallback(
    (
      r: Vec4,
      { ctrlKey, shiftKey }: { ctrlKey: boolean; shiftKey: boolean },
    ) => {
      const selectedBarKeys: (string | number)[] = [];
      const r0 = { x: r[0], y: r[1], width: r[2], height: r[3] };
      for (const bb of barBoxes) {
        if (bb.x1 <= r0.x + r0.width && bb.x2 >= r0.x) {
          selectedBarKeys.push(bb.key);
        }
      }
      onSelectRect && onSelectRect(r0, selectedBarKeys, { ctrlKey, shiftKey });
    },
    [barBoxes, onSelectRect],
  );
  const handleClickPoint = useCallback(
    (
      x: Vec2,
      { ctrlKey, shiftKey }: { ctrlKey: boolean; shiftKey: boolean },
    ) => {},
    [],
  );
  const {
    onMouseMove,
    onMouseDown,
    onMouseUp,
    onMouseLeave,
    paintDragSelectLayer,
  } = useDragSelectLayer(width, height, handleSelectRect, handleClickPoint);

  const dragSelectCanvas = useMemo(() => {
    return (
      <BaseCanvas
        width={width}
        height={height}
        draw={paintDragSelectLayer}
        drawData={emptyDrawData}
      />
    );
  }, [width, height, paintDragSelectLayer]);

  return (
    <div
      style={{ width, height, position: "relative" }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseLeave}
    >
      <BarPlotMainLayer
        barBoxes={barBoxes}
        margins={margins}
        pixelTicks={pixelTicks}
        pixelVerticalLines={pixelVerticalLines}
        xLabel={xLabel}
        width={width}
        height={height}
      />
      {dragSelectCanvas}
    </div>
  );
};

export default BarPlot;
