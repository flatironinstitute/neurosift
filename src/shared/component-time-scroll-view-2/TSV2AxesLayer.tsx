import { FunctionComponent, useCallback } from "react";
import { TickSet } from "./YAxisTicks";
import BaseCanvas from "./BaseCanvas";
import { TimeTick } from "./timeTicks";
import { paintAxes } from "./TSV2PaintAxes";

export type TSV2AxesLayerProps = {
  timeRange: [number, number];
  timeTicks: TimeTick[];
  margins: { left: number; right: number; top: number; bottom: number };
  gridlineOpts?: { hideX: boolean; hideY: boolean };
  yTickSet?: TickSet;
  yLabel?: string;
  width: number;
  height: number;
};

const emptyDrawData = {};

const TSV2AxesLayer: FunctionComponent<TSV2AxesLayerProps> = (props) => {
  const { width, height } = props;

  const paint = useCallback(
    (context: CanvasRenderingContext2D) => {
      paintAxes(context, props);
    },
    [props],
  );

  return (
    <span className="TSV2AxesLayer">
      <BaseCanvas
        width={width}
        height={height}
        draw={paint}
        drawData={emptyDrawData}
      />
    </span>
  );
};

export default TSV2AxesLayer;
