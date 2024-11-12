import { TickSet } from "./YAxisTicks";
import { TimeTick } from "./timeTicks";
import { TSV2AxesLayerProps } from "./TSV2AxesLayer";

export const paintAxes = (
  context: CanvasRenderingContext2D,
  props: TSV2AxesLayerProps,
) => {
  const { width, height, margins, timeTicks, gridlineOpts, yTickSet, yLabel } =
    props;
  context.clearRect(0, 0, context.canvas.width, context.canvas.height);

  const xAxisVerticalPosition = height - margins.bottom;
  paintTimeTicks(context, timeTicks, xAxisVerticalPosition, margins.top, {
    hideGridlines: gridlineOpts?.hideX,
  });
  context.strokeStyle = "lightgray";
  drawLine(
    context,
    margins.left,
    xAxisVerticalPosition,
    width - margins.right,
    xAxisVerticalPosition,
  );

  yTickSet &&
    paintYTicks(
      context,
      yTickSet,
      xAxisVerticalPosition,
      margins.left,
      width - margins.right,
      margins.top,
      { hideGridlines: gridlineOpts?.hideY },
    );

  yLabel &&
    paintYLabel(
      context,
      yLabel,
      margins.left,
      margins.bottom,
      margins.top,
      context.canvas.height,
    );
};

const paintTimeTicks = (
  context: CanvasRenderingContext2D,
  timeTicks: TimeTick[],
  xAxisPixelHeight: number,
  plotTopPixelHeight: number,
  o: { hideGridlines?: boolean },
) => {
  const hideTimeAxis = false;
  if (!timeTicks || timeTicks.length === 0) return;
  // Grid line length: if time axis is shown, grid lines extends 5 pixels below it. Otherwise they should stop at the edge of the plotting space.
  const labelOffsetFromGridline = 2;
  const gridlineBottomEdge = xAxisPixelHeight + (hideTimeAxis ? 0 : +5);
  context.textAlign = "center";
  context.textBaseline = "top";
  timeTicks.forEach((tick) => {
    context.strokeStyle = tick.major ? "gray" : "lightgray";
    const topPixel = !o.hideGridlines ? plotTopPixelHeight : xAxisPixelHeight;
    drawLine(
      context,
      tick.pixelXposition,
      gridlineBottomEdge,
      tick.pixelXposition,
      topPixel,
    );
    if (!hideTimeAxis) {
      context.fillStyle = tick.major ? "black" : "gray";
      context.fillText(
        tick.label,
        tick.pixelXposition,
        gridlineBottomEdge + labelOffsetFromGridline,
      );
    }
  });
};

const paintYTicks = (
  context: CanvasRenderingContext2D,
  tickSet: TickSet,
  xAxisYCoordinate: number,
  yAxisXCoordinate: number,
  plotRightPx: number,
  topMargin: number,
  o: { hideGridlines?: boolean },
) => {
  const labelOffsetFromGridline = 2;
  const gridlineLeftEdge = yAxisXCoordinate - 5;
  const labelRightEdge = gridlineLeftEdge - labelOffsetFromGridline;
  const { ticks } = tickSet;
  context.fillStyle = "black";
  context.textAlign = "right";

  context.textBaseline = "middle";
  ticks.forEach((tick) => {
    if (!tick.pixelValue) return;

    // Fixed this issue on 6/28/2024
    // const pixelValueWithMargin = tick.pixelValue + topMargin
    const pixelValueWithMargin = tick.pixelValue;

    context.strokeStyle = tick.isMajor ? "gray" : "lightgray";
    context.fillStyle = tick.isMajor ? "black" : "gray";
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
  leftMargin: number,
  bottomMargin: number,
  topMargin: number,
  canvasHeight: number,
) => {
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.save();
  context.translate(
    10,
    (canvasHeight - bottomMargin - topMargin) / 2 + topMargin,
  );
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
