import {
  useTimeRange,
  useTimeseriesSelection,
} from "@shared/context-timeseries-selection-2";
import { FunctionComponent, useEffect, useState } from "react";
import "../common/loadingState.css";
import { Controls, CondensedControls } from "./Controls";
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
    return (
      <div className="loadingContainer">
        Initializing spike trains client...
      </div>
    );
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
  const [usePlotly, setUsePlotly] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [visibleUnitsStart, setVisibleUnitsStart] = useState(0);
  const [numVisibleUnits, setNumVisibleUnits] = useState(4);

  const { zoomVisibleTimeRange, translateVisibleTimeRangeFrac } =
    useTimeseriesSelection();

  const { visibleStartTimeSec, visibleEndTimeSec } = useTimeRange();
  const visibleDuration =
    visibleStartTimeSec !== undefined && visibleEndTimeSec !== undefined
      ? visibleEndTimeSec - visibleStartTimeSec
      : undefined;

  useEffect(() => {
    if (!spikeTrainsClient) return;
    if (visibleStartTimeSec === undefined || visibleDuration === undefined)
      return;
    setIsLoading(true);
    const load = async () => {
      const unitIds = spikeTrainsClient.unitIds.slice(
        visibleUnitsStart,
        visibleUnitsStart + numVisibleUnits,
      );
      const spikeTimes: number[][] = [];
      for (const unitId of unitIds) {
        const spikes = await spikeTrainsClient.getUnitSpikeTrainForTimeRange(
          unitId,
          visibleStartTimeSec,
          visibleStartTimeSec + visibleDuration,
        );
        spikeTimes.push(spikes);
      }
      setPlotData({
        unitIds: unitIds.map((id) => id.toString()),
        spikeTimes,
        startTime: visibleStartTimeSec,
        duration: visibleDuration,
        totalNumUnits: spikeTrainsClient.unitIds.length,
      });
      setIsLoading(false);
    };
    load();
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

  const handleIncreaseUnits = () => {
    if (!spikeTrainsClient) return;
    const remainingUnits = spikeTrainsClient.unitIds.length - visibleUnitsStart;
    if (numVisibleUnits === remainingUnits) return; // Already showing all units

    const nextPowerOfTwo = numVisibleUnits * 2;
    // If next power of 2 exceeds remaining units, show all remaining units
    const newNumUnits =
      nextPowerOfTwo > remainingUnits ? remainingUnits : nextPowerOfTwo;
    setNumVisibleUnits(newNumUnits);
  };

  const handleDecreaseUnits = () => {
    if (!spikeTrainsClient) return;
    // If current count is equal to total units, go to previous power of 2
    if (
      numVisibleUnits ===
      spikeTrainsClient.unitIds.length - visibleUnitsStart
    ) {
      const prevPowerOfTwo = Math.pow(
        2,
        Math.floor(Math.log2(numVisibleUnits - 1)),
      );
      setNumVisibleUnits(prevPowerOfTwo);
      return;
    }
    // Otherwise divide by 2, but ensure at least 1 unit
    const newNumUnits = Math.max(1, Math.floor(numVisibleUnits / 2));
    setNumVisibleUnits(newNumUnits);
  };

  const handleShiftUnitsLeft = () => {
    if (!spikeTrainsClient) return;
    const newStart = Math.max(0, visibleUnitsStart - numVisibleUnits);
    setVisibleUnitsStart(newStart);
  };

  const handleShiftUnitsRight = () => {
    if (!spikeTrainsClient) return;
    const newStart = Math.min(
      spikeTrainsClient.unitIds.length - numVisibleUnits,
      visibleUnitsStart + numVisibleUnits,
    );
    setVisibleUnitsStart(newStart);
  };

  const handleIncreaseVisibleDuration = () => {
    zoomVisibleTimeRange(2);
  };

  const handleDecreaseVisibleDuration = () => {
    zoomVisibleTimeRange(0.5);
  };

  const handleShiftTimeLeft = () => {
    translateVisibleTimeRangeFrac(-0.5);
  };

  const handleShiftTimeRight = () => {
    translateVisibleTimeRangeFrac(0.5);
  };

  if (!spikeTrainsClient)
    return (
      <div className="loadingContainer">Loading spike trains client...</div>
    );
  if (!plotData)
    return <div className="loadingContainer">Loading spike times...</div>;

  return (
    <div style={{ position: "relative" }}>
      <div style={{ position: "absolute", top: 5, right: 5, zIndex: 1000 }}>
        <button
          onClick={() => setUsePlotly((p) => !p)}
          style={{
            padding: "4px 8px",
            backgroundColor: usePlotly ? "#007bff" : "#6c757d",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          {usePlotly ? "Plotly" : "."}
        </button>
      </div>
      {isLoading && <div className="loadingIndicator">Loading data...</div>}
      {condensed ? (
        <CondensedControls
          startTime={spikeTrainsClient.startTimeSec}
          endTime={spikeTrainsClient.endTimeSec}
          visibleUnitsStart={visibleUnitsStart}
          numVisibleUnits={numVisibleUnits}
          totalNumUnits={plotData.totalNumUnits}
          visibleTimeStart={visibleStartTimeSec}
          visibleDuration={visibleDuration}
          blockSizeSec={blockSizeSec}
          onDecreaseUnits={handleDecreaseUnits}
          onIncreaseUnits={handleIncreaseUnits}
          onShiftUnitsLeft={handleShiftUnitsLeft}
          onShiftUnitsRight={handleShiftUnitsRight}
          onDecreaseVisibleDuration={handleDecreaseVisibleDuration}
          onIncreaseVisibleDuration={handleIncreaseVisibleDuration}
          onShiftTimeLeft={handleShiftTimeLeft}
          onShiftTimeRight={handleShiftTimeRight}
        />
      ) : (
        <Controls
          startTime={spikeTrainsClient.startTimeSec}
          endTime={spikeTrainsClient.endTimeSec}
          visibleUnitsStart={visibleUnitsStart}
          numVisibleUnits={numVisibleUnits}
          totalNumUnits={plotData.totalNumUnits}
          visibleTimeStart={visibleStartTimeSec}
          visibleDuration={visibleDuration}
          blockSizeSec={blockSizeSec}
          onDecreaseUnits={handleDecreaseUnits}
          onIncreaseUnits={handleIncreaseUnits}
          onShiftUnitsLeft={handleShiftUnitsLeft}
          onShiftUnitsRight={handleShiftUnitsRight}
          onDecreaseVisibleDuration={handleDecreaseVisibleDuration}
          onIncreaseVisibleDuration={handleIncreaseVisibleDuration}
          onShiftTimeLeft={handleShiftTimeLeft}
          onShiftTimeRight={handleShiftTimeRight}
        />
      )}
      {usePlotly ? (
        <RasterViewPlot plotData={plotData} />
      ) : (
        <div
          style={{ position: "relative", width, height: condensed ? 200 : 350 }}
        >
          <RasterViewPlotTSV2
            plotData={plotData}
            width={width}
            height={condensed ? 200 : 350}
          />
        </div>
      )}
    </div>
  );
};

const useDirectSpikeTrainsClient = (nwbUrl: string, path: string) => {
  const [spikeTrainsClient, setSpikeTrainsClient] =
    useState<ChunkedDirectSpikeTrainsClient | null>(null);

  useEffect(() => {
    const create = async () => {
      const client = await ChunkedDirectSpikeTrainsClient.create(
        nwbUrl,
        path,
        blockSizeSec,
      );
      setSpikeTrainsClient(client);
    };
    create();
  }, [nwbUrl, path]);

  return spikeTrainsClient;
};

export default RasterView;
