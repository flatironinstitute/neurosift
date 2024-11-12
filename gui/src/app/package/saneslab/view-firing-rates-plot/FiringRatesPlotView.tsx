import { FunctionComponent, useCallback, useMemo, useState } from "react";
import {
  DefaultToolbarWidth,
  TimeScrollView,
  usePanelDimensions,
  useTimeseriesMargins,
} from "../../component-time-scroll-view";
import {
  useTimeRange,
  useTimeseriesSelectionInitialization,
} from "neurosift-lib/contexts/context-timeseries-selection";
import {
  idToNum,
  useSelectedUnitIds,
} from "neurosift-lib/contexts/context-unit-selection";
import BottomToolbar, { Action } from "./BottomToolbar";
import { FiringRatesPlotViewData } from "./FiringRatesPlotViewData";

type Props = {
  data: FiringRatesPlotViewData;
  width: number;
  height: number;
};

export type TimeseriesLayoutOpts = {
  hideToolbar?: boolean;
  hideTimeAxis?: boolean;
  useYAxis?: boolean;
};

type PanelProps = {
  segments: {
    t1: number;
    t2: number;
    firingRate: number;
  }[];
};

const panelSpacing = 0;

const FiringRatesPlotView: FunctionComponent<Props> = ({
  data,
  width,
  height,
}) => {
  const { selectedUnitIds } = useSelectedUnitIds();

  const timeseriesLayoutOpts = useMemo(
    () => ({ hideToolbar: data.hideToolbar }),
    [data.hideToolbar],
  );

  useTimeseriesSelectionInitialization(data.startTimeSec, data.endTimeSec);
  const { visibleStartTimeSec, visibleEndTimeSec } = useTimeRange();

  const margins = useTimeseriesMargins(timeseriesLayoutOpts);

  // tried the various color maps, but none seemed as good as the hsv one defined below
  // const {colorMapFunction} = useColorMapFunction('legacy', 30)

  // Compute the per-panel pixel drawing area dimensions.
  const panelCount = useMemo(() => data.plots.length, [data.plots]);
  const toolbarWidth = timeseriesLayoutOpts?.hideToolbar
    ? 0
    : DefaultToolbarWidth;
  const { panelWidth, panelHeight } = usePanelDimensions(
    width - toolbarWidth,
    height,
    panelCount,
    panelSpacing,
    margins,
  );

  const [binSizeSec, setBinSizeSec] = useState(0.1);
  const [brightness, setBrightness] = useState(0.5);

  // const smoothingRadius = 2
  const smoothingFactor = 0;
  const numBins = useMemo(
    () => Math.ceil(data.endTimeSec - data.startTimeSec) / binSizeSec,
    [data.startTimeSec, data.endTimeSec, binSizeSec],
  );
  const firingRatePlots: {
    unitId: number | string;
    spikeCounts: number[];
  }[] = useMemo(
    () =>
      data.plots
        .sort((p1, p2) => idToNum(p1.unitId) - idToNum(p2.unitId))
        .map((plot) => {
          const spikeCounts: number[] = [];
          for (let i = 0; i < numBins; i++) {
            spikeCounts.push(0);
          }
          for (const t of plot.spikeTimesSec) {
            const b = Math.floor((t - data.startTimeSec) / binSizeSec);
            spikeCounts[b] += 1;
          }
          let spikeCountsSmoothed: number[] = [];
          if (smoothingFactor) {
            let lastVal = 0;
            for (let i = 0; i < spikeCounts.length; i++) {
              lastVal =
                lastVal * smoothingFactor +
                spikeCounts[i] * (1 - smoothingFactor);
              spikeCountsSmoothed.push(lastVal);
            }
          } else spikeCountsSmoothed = spikeCounts;
          // for (let i = 0; i < numBins; i++) {
          //     spikeCountsSmoothed.push(computeMean(spikeCounts.slice(Math.max(i - smoothingRadius, 0), Math.min(i + smoothingRadius + 1, numBins))))
          // }
          return {
            unitId: plot.unitId,
            spikeCounts: spikeCountsSmoothed,
          };
        }),
    [data.plots, data.startTimeSec, numBins, binSizeSec],
  );

  const paintPanel = useCallback(
    (context: CanvasRenderingContext2D, props: PanelProps) => {
      if (visibleStartTimeSec === undefined || visibleEndTimeSec === undefined)
        return;
      const maxLevel = 20 * Math.exp(-5 * (brightness - 0.5));
      context.save();
      context.beginPath();
      context.rect(-1, 0, panelWidth, panelHeight + 2);
      context.clip();
      // eslint-disable-next-line react/prop-types
      for (const seg of props.segments) {
        // context.fillStyle = colorMapFunction(seg.firingRate) // see comment above
        context.fillStyle = firingRateToColor(seg.firingRate, maxLevel);
        const x1 =
          ((seg.t1 - visibleStartTimeSec) /
            (visibleEndTimeSec - visibleStartTimeSec)) *
          panelWidth;
        const x2 =
          ((seg.t2 - visibleStartTimeSec) /
            (visibleEndTimeSec - visibleStartTimeSec)) *
          panelWidth;
        context.fillRect(x1, 0, x2 - x1, Math.max(panelHeight, 1));
      }
      context.restore();
    },
    [
      panelHeight,
      panelWidth,
      visibleStartTimeSec,
      visibleEndTimeSec,
      brightness,
    ],
  );

  const panels = useMemo(
    () =>
      firingRatePlots.map((plot) => {
        const i1 = Math.max(
          0,
          Math.floor((visibleStartTimeSec || 0) / binSizeSec - 1),
        );
        const i2 = Math.min(
          numBins,
          Math.ceil((visibleEndTimeSec || 0) / binSizeSec + 1),
        );
        const segments: {
          t1: number;
          t2: number;
          firingRate: number;
        }[] = [];

        for (let ii = i1; ii < i2; ii++) {
          const sc = plot.spikeCounts[ii];
          segments.push({
            t1: data.startTimeSec + ii * binSizeSec,
            t2: data.startTimeSec + (ii + 1) * binSizeSec,
            firingRate: sc / binSizeSec,
          });
        }

        const panelProps: PanelProps = {
          segments,
        };

        return {
          key: `${plot.unitId}`,
          label: `${plot.unitId}`,
          props: panelProps,
          paint: paintPanel,
        };
      }),
    [
      firingRatePlots,
      visibleStartTimeSec,
      visibleEndTimeSec,
      paintPanel,
      data.startTimeSec,
      numBins,
      binSizeSec,
    ],
  );

  const binSizeActions: Action[] = useMemo(() => {
    const binSizes: number[] = [
      0.01, 0.02, 0.05, 0.08, 0.1, 0.2, 0.5, 0.8, 1, 2, 5, 8, 10, 20, 50, 80,
      100,
    ];
    // function _handleBinSizeUp() {
    //     const i = binSizes.findIndex(a => (a === binSizeSec))
    //     if (i < 0) {
    //         setBinSizeSec(binSizes[0])
    //     }
    //     else if (i + 1 < binSizes.length) {
    //         setBinSizeSec(binSizes[i + 1])
    //     }
    // }
    // function _handleBinSizeDown() {
    //     const i = binSizes.findIndex(a => (a === binSizeSec))
    //     if (i < 0) {
    //         setBinSizeSec(binSizes[0])
    //     }
    //     else if (i - 1 >= 0) {
    //         setBinSizeSec(binSizes[i - 1])
    //     }
    // }
    return [
      {
        type: "select",
        label: "Bin size (s):",
        choices: binSizes.map((s) => ({
          key: s,
          label: s,
        })),
        value: binSizeSec,
        onChange: (v) => setBinSizeSec(v as number),
      },
      {
        type: "slider",
        label: "Color scale:",
        min: 0,
        max: 1,
        step: 0.01,
        value: brightness,
        onChange: setBrightness,
      },
    ];
  }, [binSizeSec, brightness]);

  const toolbarHeight = 25;

  return visibleStartTimeSec === undefined ? (
    <div>Loading...</div>
  ) : (
    <div>
      <TimeScrollView
        margins={margins}
        panels={panels}
        panelSpacing={panelSpacing}
        selectedPanelKeys={selectedUnitIds}
        timeseriesLayoutOpts={timeseriesLayoutOpts}
        width={width}
        height={height - toolbarHeight}
      />
      <BottomToolbar actions={binSizeActions} />
    </div>
  );
};

// function computeMean(a: number[]) {
//     return a.reduce((v, prev) => (v + prev), 0) / a.length
// }

function firingRateToColor(f: number, maxLevel: number) {
  const a = Math.min(1, f / maxLevel);
  return heatMapColorforValue(a, a);
}

// https://stackoverflow.com/questions/12875486/what-is-the-algorithm-to-create-colors-for-a-heatmap
function heatMapColorforValue(value: number, saturation: number) {
  const h = Math.floor((1.0 - value) * 240);
  return `hsl(${h},${Math.floor(saturation * 100)}%,50%)`;
  // 0    : blue   (hsl(240, 100%, 50%))
  // 0.25 : cyan   (hsl(180, 100%, 50%))
  // 0.5  : green  (hsl(120, 100%, 50%))
  // 0.75 : yellow (hsl(60, 100%, 50%))
  // 1    : red    (hsl(0, 100%, 50%))
}

export default FiringRatesPlotView;
