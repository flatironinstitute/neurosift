import {
  useTimeRange,
  useTimeseriesSelection,
} from "@shared/context-timeseries-selection-2";
import {
  useLinkedSettings,
  useShareSettings,
} from "@shared/shareLink/useShareSettings";
import { formatRun, parseRun } from "@shared/shareLink/linkSettings";
import { FunctionComponent, useEffect, useState } from "react";
import { ChannelWindow, LoadingState, SegmentedControl } from "@ui";
import TimeView, { TIME_VIEW_INSET } from "../common/TimeView";
import "./RasterView.css";
import { ChunkedDirectSpikeTrainsClient } from "../PSTH/PSTHItemView/DirectSpikeTrainsClient";
import RasterViewPlot from "./RasterViewPlot";
import RasterViewPlotTSV2 from "./RasterViewPlotTSV2";

type Props = {
  width?: number;
  nwbUrl: string;
  path: string;
  condensed?: boolean;
};

const RasterView: FunctionComponent<Props> = ({
  width,
  condensed,
  nwbUrl,
  path,
}) => {
  const spikeTrainsClient = useDirectSpikeTrainsClient(nwbUrl, path);
  if (!spikeTrainsClient)
    return <LoadingState label="Reading the units" phase="loading" />;
  return (
    <RasterViewChild
      spikeTrainsClient={spikeTrainsClient}
      width={width || 500}
      condensed={condensed}
    />
  );
};

type PlotData = {
  unitIds: string[];
  spikeTimes: number[][];
  startTime: number;
  duration: number;
  totalNumUnits: number;
};

const blockSizeSec = 30;

const RasterViewChild = ({
  spikeTrainsClient,
  width,
  condensed,
}: {
  spikeTrainsClient: ChunkedDirectSpikeTrainsClient;
  width: number;
  condensed?: boolean;
}) => {
  const [plotData, setPlotData] = useState<PlotData | null>(null);
  const linked = useLinkedSettings();
  const [usePlotly, setUsePlotly] = useState(
    () => linked.get("renderer") === "plotly",
  );
  const [isLoading, setIsLoading] = useState(false);
  const [linkedUnits] = useState(() => {
    const run = parseRun(linked.get("units"));
    const total = spikeTrainsClient.unitIds.length;
    return run && run.first < total
      ? { first: run.first, count: Math.min(run.count, total - run.first) }
      : { first: 0, count: 4 };
  });
  const [visibleUnitsStart, setVisibleUnitsStart] = useState(linkedUnits.first);
  const [numVisibleUnits, setNumVisibleUnits] = useState(linkedUnits.count);
  useShareSettings([
    {
      key: "units",
      value: formatRun(visibleUnitsStart, numVisibleUnits),
      default: formatRun(0, 4),
      label: "units",
    },
    {
      key: "renderer",
      value: usePlotly ? "plotly" : "canvas",
      default: "canvas",
      label: "the renderer",
    },
  ]);

  const { visibleStartTimeSec, visibleEndTimeSec } = useTimeRange();
  const visibleDuration =
    visibleStartTimeSec !== undefined && visibleEndTimeSec !== undefined
      ? visibleEndTimeSec - visibleStartTimeSec
      : undefined;

  useEffect(() => {
    if (!spikeTrainsClient) return;
    if (visibleStartTimeSec === undefined || visibleDuration === undefined)
      return;
    let canceled = false;
    setIsLoading(true);
    const load = async () => {
      const unitIds = spikeTrainsClient.unitIds.slice(
        visibleUnitsStart,
        visibleUnitsStart + numVisibleUnits,
      );
      const spikeTimes = await Promise.all(
        unitIds.map((unitId) =>
          spikeTrainsClient.getUnitSpikeTrainForTimeRange(
            unitId,
            visibleStartTimeSec,
            visibleStartTimeSec + visibleDuration,
          ),
        ),
      );
      if (canceled) return;
      setPlotData({
        unitIds: unitIds.map((id) => id.toString()),
        spikeTimes,
        startTime: visibleStartTimeSec,
        duration: visibleDuration,
        totalNumUnits: spikeTrainsClient.unitIds.length,
      });
      setIsLoading(false);
    };
    load().catch((err) => {
      if (canceled) return;
      console.error(err);
      setIsLoading(false);
    });
    return () => {
      canceled = true;
    };
  }, [
    visibleStartTimeSec,
    visibleDuration,
    numVisibleUnits,
    visibleUnitsStart,
    spikeTrainsClient,
  ]);

  const { initializeTimeseriesSelection } = useTimeseriesSelection();

  useEffect(() => {
    if (!spikeTrainsClient) return;
    initializeTimeseriesSelection({
      startTimeSec: spikeTrainsClient.startTimeSec,
      endTimeSec: spikeTrainsClient.endTimeSec,
      initialVisibleStartTimeSec: spikeTrainsClient.startTimeSec,
      initialVisibleEndTimeSec: Math.min(
        spikeTrainsClient.startTimeSec + 10,
        spikeTrainsClient.endTimeSec,
      ),
    });
  }, [spikeTrainsClient, initializeTimeseriesSelection]);

  if (!plotData)
    return <LoadingState label="Reading the spike times" phase="loading" />;

  const total = plotData.totalNumUnits;
  const height = condensed ? 200 : 350;
  return (
    <TimeView
      label="Raster"
      summary={rasterSummary(
        spikeTrainsClient.startTimeSec,
        spikeTrainsClient.endTimeSec,
        total,
      )}
      busy={isLoading}
      condensed={condensed}
      controls={
        <>
          <ChannelWindow
            label="Units"
            total={total}
            value={{ first: visibleUnitsStart, count: numVisibleUnits }}
            onChange={({ first, count }) => {
              setVisibleUnitsStart(first);
              setNumVisibleUnits(count);
            }}
          />
          <SegmentedControl
            label="Renderer"
            size="sm"
            value={usePlotly ? "plotly" : "canvas"}
            onChange={(v) => setUsePlotly(v === "plotly")}
            options={[
              { value: "canvas", label: "Canvas" },
              { value: "plotly", label: "Plotly" },
            ]}
          />
        </>
      }
    >
      {usePlotly ? (
        <RasterViewPlot plotData={plotData} />
      ) : (
        <div className="raster-canvas">
          <RasterViewPlotTSV2
            plotData={plotData}
            width={width - TIME_VIEW_INSET}
            height={height}
          />
        </div>
      )}
    </TimeView>
  );
};

const seconds = (s: number) =>
  s.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/** The recording span and how many units. */
const rasterSummary = (start: number, end: number, units: number) =>
  `${seconds(start)}–${seconds(end)} s · ${units.toLocaleString("en-US")} unit${units === 1 ? "" : "s"}`;

const useDirectSpikeTrainsClient = (nwbUrl: string, path: string) => {
  const [spikeTrainsClient, setSpikeTrainsClient] =
    useState<ChunkedDirectSpikeTrainsClient | null>(null);

  useEffect(() => {
    setSpikeTrainsClient(null);
    let canceled = false;
    const create = async () => {
      const client = await ChunkedDirectSpikeTrainsClient.create(
        nwbUrl,
        path,
        blockSizeSec,
      );
      if (canceled) return;
      setSpikeTrainsClient(client);
    };
    create().catch((err) => {
      if (canceled) return;
      console.error(err);
    });
    return () => {
      canceled = true;
    };
  }, [nwbUrl, path]);

  return spikeTrainsClient;
};

export default RasterView;
