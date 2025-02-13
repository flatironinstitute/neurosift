import {
  useTimeRange,
  useTimeseriesSelection,
} from "@shared/context-timeseries-selection-2";
import { FunctionComponent, useEffect, useState } from "react";
import "../common/loadingState.css";
import { ChunkedDirectSpikeTrainsClient } from "../PSTH/PSTHItemView/DirectSpikeTrainsClient";
import RasterViewPlot from "./RasterViewPlot";

type Props = {
  nwbUrl: string;
  path: string;
};

const RasterView: FunctionComponent<Props> = ({ nwbUrl, path }) => {
  const spikeTrainsClient = useDirectSpikeTrainsClient(nwbUrl, path);
  if (!spikeTrainsClient)
    return (
      <div className="loadingContainer">
        Initializing spike trains client...
      </div>
    );
  return <RasterViewChild spikeTrainsClient={spikeTrainsClient} />;
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
}: {
  spikeTrainsClient: ChunkedDirectSpikeTrainsClient;
}) => {
  const [plotData, setPlotData] = useState<PlotData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [visibleUnitsStart, setVisibleUnitsStart] = useState(0);
  const [numVisibleUnits, setNumVisibleUnits] = useState(4);

  const { visibleStartTimeSec, visibleEndTimeSec, setVisibleTimeRange } =
    useTimeRange();
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
    if (visibleDuration === undefined) return;
    if (visibleStartTimeSec === undefined) return;
    if (visibleEndTimeSec === undefined) return;
    setVisibleTimeRange(
      visibleStartTimeSec,
      visibleEndTimeSec + visibleDuration,
    );
  };

  const handleDecreaseVisibleDuration = () => {
    if (visibleDuration === undefined) return;
    if (visibleStartTimeSec === undefined) return;
    if (visibleEndTimeSec === undefined) return;
    setVisibleTimeRange(
      visibleStartTimeSec,
      visibleEndTimeSec - visibleDuration / 2,
    );
  };

  const handleShiftTimeLeft = () => {
    if (!spikeTrainsClient) return;
    if (visibleDuration === undefined) return;
    if (visibleStartTimeSec === undefined) return;
    const timeShift = visibleDuration;
    const t1 = Math.max(
      spikeTrainsClient.startTimeSec,
      visibleStartTimeSec - timeShift,
    );
    const t2 = Math.min(spikeTrainsClient.endTimeSec, visibleStartTimeSec);
    setVisibleTimeRange(t1, t2);
  };

  const handleShiftTimeRight = () => {
    if (!spikeTrainsClient) return;
    if (visibleDuration === undefined) return;
    if (visibleStartTimeSec === undefined) return;
    if (visibleEndTimeSec === undefined) return;
    const timeShift = visibleDuration;
    const t1 = Math.max(
      spikeTrainsClient.startTimeSec,
      visibleStartTimeSec + timeShift,
    );
    const t2 = Math.min(
      spikeTrainsClient.endTimeSec,
      visibleEndTimeSec + timeShift,
    );
    setVisibleTimeRange(t1, t2);
  };

  if (!spikeTrainsClient)
    return (
      <div className="loadingContainer">Loading spike trains client...</div>
    );
  if (!plotData)
    return <div className="loadingContainer">Loading spike times...</div>;

  return (
    <div style={{ position: "relative" }}>
      {isLoading && <div className="loadingIndicator">Loading data...</div>}
      <div
        style={{
          padding: "10px",
          marginBottom: "15px",
          background: "#f5f5f5",
          borderRadius: "5px",
          fontFamily: "sans-serif",
          fontSize: "0.9rem",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "auto 1fr",
            gap: "4px 12px",
            alignItems: "baseline",
          }}
        >
          <div style={{ fontWeight: "bold" }}>Units:</div>
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            <span>
              Showing {visibleUnitsStart} -{" "}
              {Math.min(
                visibleUnitsStart + numVisibleUnits,
                plotData.totalNumUnits,
              ) - 1}{" "}
              of {plotData.totalNumUnits}
            </span>
            <button
              onClick={handleDecreaseUnits}
              disabled={numVisibleUnits <= 1}
              style={{
                padding: "2px 6px",
                border: "1px solid #ccc",
                borderRadius: "2px",
                fontSize: "0.85rem",
                backgroundColor: numVisibleUnits <= 1 ? "#f5f5f5" : "white",
                cursor: numVisibleUnits <= 1 ? "default" : "pointer",
              }}
            >
              /2
            </button>
            <button
              onClick={handleIncreaseUnits}
              disabled={
                visibleUnitsStart + numVisibleUnits >= plotData.totalNumUnits
              }
              style={{
                padding: "2px 6px",
                border: "1px solid #ccc",
                borderRadius: "2px",
                fontSize: "0.85rem",
                backgroundColor:
                  visibleUnitsStart + numVisibleUnits * 2 >
                  plotData.totalNumUnits
                    ? "#f5f5f5"
                    : "white",
                cursor:
                  visibleUnitsStart + numVisibleUnits * 2 >
                  plotData.totalNumUnits
                    ? "default"
                    : "pointer",
              }}
            >
              ×2
            </button>
            <button
              onClick={handleShiftUnitsLeft}
              disabled={visibleUnitsStart === 0}
              style={{
                padding: "2px 6px",
                border: "1px solid #ccc",
                borderRadius: "2px",
                fontSize: "0.85rem",
                backgroundColor: visibleUnitsStart === 0 ? "#f5f5f5" : "white",
                cursor: visibleUnitsStart === 0 ? "default" : "pointer",
              }}
            >
              ←
            </button>
            <button
              onClick={handleShiftUnitsRight}
              disabled={
                visibleUnitsStart + numVisibleUnits >= plotData.totalNumUnits
              }
              style={{
                padding: "2px 6px",
                border: "1px solid #ccc",
                borderRadius: "2px",
                fontSize: "0.85rem",
                backgroundColor:
                  visibleUnitsStart + numVisibleUnits >= plotData.totalNumUnits
                    ? "#f5f5f5"
                    : "white",
                cursor:
                  visibleUnitsStart + numVisibleUnits >= plotData.totalNumUnits
                    ? "default"
                    : "pointer",
              }}
            >
              →
            </button>
          </div>

          <div style={{ fontWeight: "bold" }}>Time Window:</div>
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            <span>
              Showing {(visibleDuration || 0).toFixed(1)} sec starting at{" "}
              {(visibleStartTimeSec || 0).toFixed(1)} sec
            </span>
            <button
              onClick={handleDecreaseVisibleDuration}
              disabled={(visibleDuration || 0) <= blockSizeSec}
              style={{
                padding: "2px 6px",
                border: "1px solid #ccc",
                borderRadius: "2px",
                fontSize: "0.85rem",
                backgroundColor:
                  (visibleDuration || 0) <= blockSizeSec ? "#f5f5f5" : "white",
                cursor:
                  (visibleDuration || 0) <= blockSizeSec
                    ? "default"
                    : "pointer",
              }}
            >
              /2
            </button>
            <button
              onClick={handleIncreaseVisibleDuration}
              style={{
                padding: "2px 6px",
                border: "1px solid #ccc",
                borderRadius: "2px",
                fontSize: "0.85rem",
                backgroundColor: "white",
                cursor: "pointer",
              }}
            >
              ×2
            </button>
            <button
              onClick={handleShiftTimeLeft}
              disabled={
                (visibleStartTimeSec || 0) <= spikeTrainsClient.startTimeSec
              }
              style={{
                padding: "2px 6px",
                border: "1px solid #ccc",
                borderRadius: "2px",
                fontSize: "0.85rem",
                backgroundColor:
                  (visibleStartTimeSec || 0) <= spikeTrainsClient.startTimeSec
                    ? "#f5f5f5"
                    : "white",
                cursor:
                  (visibleStartTimeSec || 0) <= spikeTrainsClient.startTimeSec
                    ? "default"
                    : "pointer",
              }}
            >
              ←
            </button>
            <button
              onClick={handleShiftTimeRight}
              style={{
                padding: "2px 6px",
                border: "1px solid #ccc",
                borderRadius: "2px",
                fontSize: "0.85rem",
                backgroundColor: "white",
                cursor: "pointer",
              }}
            >
              →
            </button>
          </div>

          <div style={{ fontWeight: "bold" }}>Block Size:</div>
          <div>{blockSizeSec} seconds</div>
        </div>
      </div>
      <RasterViewPlot plotData={plotData} />
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
