import TimeScrollView2, {
  useTimeScrollView2,
} from "@shared/component-time-scroll-view-2/TimeScrollView2";
import { useTimeRange } from "@shared/context-timeseries-selection-2";
import { timeSelectionBarHeight } from "@shared/TimeseriesSelectionBar/TimeseriesSelectionBar";
import { FunctionComponent, useEffect, useMemo, useState } from "react";
import { MotifBout } from "./vameUtils";

type Props = {
  width: number;
  height: number;
  bouts: MotifBout[];
  colorMap: Map<number, string>;
  selectedMotif: number | null;
  // startFrame -> letter label for the bouts currently shown as montage clips.
  displayedLabels: Map<number, string>;
};

// Suppress the full-height vertical gridlines (the prominent every-10-min lines);
// the bottom time-axis labels still render for reference.
const gridlineOpts = {
  hideX: true,
  hideY: true,
};

const yAxisInfo = {
  showTicks: false,
  yMin: undefined,
  yMax: undefined,
};

// The ethogram strip: one full-height colored rectangle per motif bout, drawn on
// the shared time axis (TimeScrollView2 supplies pan/zoom and the playhead cursor
// from the timeseries-selection context). Because bouts partition the timeline
// without overlap, the rectangles read as one continuous colored band. Mirrors
// NwbTimeIntervalsWidget's draw loop but uses the motif color map (a full
// categorical palette) instead of the 11-color interval palette, and draws the
// motif id inside any bout wide enough to fit it.
const EthogramRaster: FunctionComponent<Props> = ({
  width,
  height,
  bouts,
  colorMap,
  selectedMotif,
  displayedLabels,
}) => {
  const [canvasElement, setCanvasElement] = useState<
    HTMLCanvasElement | undefined
  >();

  const { visibleStartTimeSec, visibleEndTimeSec } = useTimeRange();

  const { canvasWidth, canvasHeight, margins } = useTimeScrollView2({
    width,
    height: height - timeSelectionBarHeight,
    hideToolbar: false,
  });

  const timeToPixel = useMemo(
    () => (t: number) => {
      if (visibleStartTimeSec === undefined) return 0;
      if (visibleEndTimeSec === undefined) return 0;
      return (
        margins.left +
        ((t - visibleStartTimeSec) /
          (visibleEndTimeSec - visibleStartTimeSec)) *
          (canvasWidth - margins.left - margins.right)
      );
    },
    [
      visibleStartTimeSec,
      visibleEndTimeSec,
      canvasWidth,
      margins.left,
      margins.right,
    ],
  );

  useEffect(() => {
    if (!canvasElement) return;
    if (visibleStartTimeSec === undefined) return;
    if (visibleEndTimeSec === undefined) return;
    const ctx = canvasElement.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    const y1 = margins.top + 4;
    // Leave just enough headroom below the strip for the clip letters, between the
    // bouts and the time-axis marks.
    const y2 = canvasHeight - margins.bottom - 14;

    let timer = Date.now();
    let canceled = false;

    (async () => {
      for (let i = 0; i < bouts.length; i++) {
        const elapsed = Date.now() - timer;
        if (elapsed > 20) {
          // take a break so we don't block the UI on long sessions
          await new Promise((r) => setTimeout(r, 1));
          timer = Date.now();
        }
        if (canceled) return;

        const bout = bouts[i];
        const x1 = timeToPixel(bout.startTime);
        const x2 = timeToPixel(bout.stopTime);
        if (x2 < 0) continue;
        if (x1 > canvasWidth) continue;

        const w = Math.max(1, x2 - x1);
        // Three tiers when a motif is selected: bouts shown as montage clips keep
        // full color, the selected motif's other bouts are faded, and every other
        // motif is greyed out. With nothing selected, all bouts show full color.
        const clipLetter =
          selectedMotif !== null
            ? displayedLabels.get(bout.startFrame)
            : undefined;
        let alpha = 1;
        let fill = colorMap.get(bout.motif) || "#999";
        const greyed = selectedMotif !== null && bout.motif !== selectedMotif;
        if (greyed) {
          fill = "#e8e8e8";
        } else if (selectedMotif !== null && clipLetter === undefined) {
          alpha = 0.35;
        }
        ctx.globalAlpha = alpha;
        ctx.fillStyle = fill;
        ctx.fillRect(x1, y1, w, y2 - y1);
        ctx.globalAlpha = 1;

        if (clipLetter !== undefined) {
          // Mark each displayed clip with its letter so it can be located on the
          // timeline; draw it just below the strip (between the bouts and the time
          // axis) with a white halo for legibility, always (even on narrow bouts).
          const cx = (x1 + x2) / 2;
          ctx.textBaseline = "top";
          ctx.textAlign = "center";
          ctx.font = "bold 13px sans-serif";
          ctx.lineWidth = 3;
          ctx.strokeStyle = "#fff";
          ctx.strokeText(clipLetter, cx, y2 + 3);
          ctx.fillStyle = "#000";
          ctx.fillText(clipLetter, cx, y2 + 3);
        } else if (selectedMotif === null && w > 18) {
          ctx.textBaseline = "middle";
          ctx.textAlign = "center";
          ctx.fillStyle = "#000";
          ctx.font = "12px sans-serif";
          ctx.fillText(String(bout.motif), x1 + w / 2, (y1 + y2) / 2);
        }
      }
    })();

    return () => {
      canceled = true;
    };
  }, [
    canvasElement,
    canvasWidth,
    canvasHeight,
    visibleStartTimeSec,
    visibleEndTimeSec,
    bouts,
    timeToPixel,
    margins,
    colorMap,
    selectedMotif,
    displayedLabels,
  ]);

  return (
    <TimeScrollView2
      width={width}
      height={height}
      onCanvasElement={setCanvasElement}
      gridlineOpts={gridlineOpts}
      yAxisInfo={yAxisInfo}
      hideToolbar={false}
      showTimeseriesToolbar={false}
      showTimeSelectionBar={false}
    />
  );
};

export default EthogramRaster;
