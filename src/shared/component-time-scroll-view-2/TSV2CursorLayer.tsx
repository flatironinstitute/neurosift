import { useMemo } from "react";
import BaseCanvas from "./BaseCanvas";
import type { PlotColors } from "../plotColors";
import { usePlotColors } from "../plotTheme";

export type TSVCursorLayerProps = {
  timeRange: [number, number];
  currentTimePixels?: number;
  currentTimeIntervalPixels?: [number, number];
  margins: { left: number; right: number; top: number; bottom: number };
  width: number;
  height: number;
};

const paintCursor = (
  context: CanvasRenderingContext2D,
  props: TSVCursorLayerProps & { colors: PlotColors },
) => {
  const { colors } = props;
  const { margins, currentTimePixels, currentTimeIntervalPixels } = props;
  context.clearRect(0, 0, context.canvas.width, context.canvas.height);

  // current time interval
  if (currentTimeIntervalPixels !== undefined) {
    context.fillStyle = colors.cursorFill;
    context.strokeStyle = colors.cursor;
    const x = currentTimeIntervalPixels[0];
    const y = margins.top;
    const w = currentTimeIntervalPixels[1] - currentTimeIntervalPixels[0];
    const h = context.canvas.height - margins.bottom - margins.top;
    context.fillRect(x, y, w, h);
    context.strokeRect(x, y, w, h);
  }

  // current time
  if (
    currentTimePixels !== undefined &&
    currentTimeIntervalPixels === undefined
  ) {
    // Draw highlight region
    context.fillStyle = colors.selectionFill;
    const highlightWidth = 4; // Width of highlight region
    context.fillRect(
      currentTimePixels - highlightWidth / 2,
      margins.top,
      highlightWidth,
      context.canvas.height - margins.bottom - margins.top,
    );

    // Draw border line
    context.strokeStyle = colors.selectionStroke;
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(currentTimePixels, margins.top);
    context.lineTo(currentTimePixels, context.canvas.height - margins.bottom);
    context.stroke();
  }
};

const TSV2CursorLayer = (props: TSVCursorLayerProps) => {
  const {
    width,
    height,
    timeRange,
    currentTimePixels,
    currentTimeIntervalPixels,
    margins,
  } = props;
  const colors = usePlotColors();
  const drawData = useMemo(
    () => ({
      colors,
      width,
      height,
      timeRange,
      currentTimePixels,
      currentTimeIntervalPixels,
      margins,
    }),
    [
      colors,
      width,
      height,
      timeRange,
      currentTimePixels,
      currentTimeIntervalPixels,
      margins,
    ],
  );

  return (
    <BaseCanvas
      width={width}
      height={height}
      draw={paintCursor}
      drawData={drawData}
    />
  );
};

export default TSV2CursorLayer;
