import { TickSet } from "./YAxisTicks";
import { TimeTick } from "./timeTicks";
import { TSV2AxesLayerProps } from "./TSV2AxesLayer";
import type { PlotColors } from "../plotColors";

export const paintAxes = (
  context: CanvasRenderingContext2D,
  props: TSV2AxesLayerProps,
  colors: PlotColors,
) => {
  const { width, height, margins, timeTicks, gridlineOpts, yTickSet, yLabel } =
    props;
  context.clearRect(0, 0, context.canvas.width, context.canvas.height);

  const xAxisVerticalPosition = height - margins.bottom;
  paintTimeTicks(context, timeTicks, xAxisVerticalPosition, margins.top, {
    hideGridlines: gridlineOpts?.hideX,
    colors,
  });
  context.strokeStyle = colors.gridMinor;
  drawLine(
    context,
    margins.left,
    xAxisVerticalPosition,
    width - margins.right,
    xAxisVerticalPosition,
  );

  if (yTickSet)
    paintYTicks(
      context,
      yTickSet,
      xAxisVerticalPosition,
      margins.left,
      width - margins.right,
      margins.top,
      { hideGridlines: gridlineOpts?.hideY, colors },
    );

  if (yLabel)
    paintYLabel(
      context,
      yLabel,
      margins.left,
      margins.bottom,
      margins.top,
      context.canvas.height,
      colors,
    );
};

const paintTimeTicks = (
  context: CanvasRenderingContext2D,
  timeTicks: TimeTick[],
  xAxisPixelHeight: number,
  plotTopPixelHeight: number,
  o: { hideGridlines?: boolean; colors: PlotColors },
) => {
  const hideTimeAxis = false;
  if (!timeTicks || timeTicks.length === 0) return;
  // Grid line length: if time axis is shown, grid lines extends 5 pixels below it. Otherwise they should stop at the edge of the plotting space.
  const labelOffsetFromGridline = 2;
  const gridlineBottomEdge = xAxisPixelHeight + (hideTimeAxis ? 0 : +5);
  context.textAlign = "center";
  context.textBaseline = "top";
  timeTicks.forEach((tick) => {
    context.strokeStyle = tick.major ? o.colors.gridMajor : o.colors.gridMinor;
    const topPixel = !o.hideGridlines ? plotTopPixelHeight : xAxisPixelHeight;
    drawLine(
      context,
      tick.xPixelPosition,
      gridlineBottomEdge,
      tick.xPixelPosition,
      topPixel,
    );
    if (!hideTimeAxis) {
      context.fillStyle = tick.major ? o.colors.text : o.colors.textMuted;
      context.fillText(
        tick.label,
        tick.xPixelPosition,
        gridlineBottomEdge + labelOffsetFromGridline,
      );
    }
  });
};

const paintYTicks = (
  context: CanvasRenderingContext2D,
  tickSet: TickSet,
  _xAxisYCoordinate: number,
  yAxisXCoordinate: number,
  plotRightPx: number,
  _topMargin: number,
  o: { hideGridlines?: boolean; colors: PlotColors },
) => {
  const labelOffsetFromGridline = 2;
  const gridlineLeftEdge = yAxisXCoordinate - 5;
  const labelRightEdge = gridlineLeftEdge - labelOffsetFromGridline;
  const { ticks } = tickSet;
  context.fillStyle = o.colors.text;
  context.textAlign = "right";

  context.textBaseline = "middle";
  ticks.forEach((tick) => {
    if (!tick.pixelValue) return;

    // Fixed this issue on 6/28/2024
    // const pixelValueWithMargin = tick.pixelValue + topMargin
    const pixelValueWithMargin = tick.pixelValue;

    context.strokeStyle = tick.isMajor
      ? o.colors.gridMajor
      : o.colors.gridMinor;
    context.fillStyle = tick.isMajor ? o.colors.text : o.colors.textMuted;
    const rightPixel = !o.hideGridlines ? plotRightPx : yAxisXCoordinate;
    drawLine(
      context,
      gridlineLeftEdge,
      pixelValueWithMargin,
      rightPixel,
      pixelValueWithMargin,
    );
    context.fillText(tick.label, labelRightEdge, pixelValueWithMargin); // TODO: Add a max width thingy
  });
};

const paintYLabel = (
  context: CanvasRenderingContext2D,
  label: string,
  _leftMargin: number,
  bottomMargin: number,
  topMargin: number,
  canvasHeight: number,
  colors: PlotColors,
) => {
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.save();
  context.translate(
    15,
    (canvasHeight - bottomMargin - topMargin) / 2 + topMargin,
  );
  context.fillStyle = colors.text;
  context.font = "13px sans-serif";

  context.rotate(-Math.PI / 2);
  context.fillText(label, 0, 0);
  context.restore();
};

const drawLine = (
  context: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
) => {
  context.beginPath();
  context.moveTo(x1, y1);
  context.lineTo(x2, y2);
  context.stroke();
};
