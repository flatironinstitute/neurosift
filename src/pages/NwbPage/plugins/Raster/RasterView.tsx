import { FunctionComponent, useEffect, useState } from "react";
import { DirectSpikeTrainsClient } from "../PSTH/PSTHItemView/DirectSpikeTrainsClient";
import RasterViewPlot from "./RasterViewPlot";
import "../common/loadingState.css";

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
  spikeTrainsClient: DirectSpikeTrainsClient;
}) => {
  const [plotData, setPlotData] = useState<PlotData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [visibleUnitsStart, setVisibleUnitsStart] = useState(0);
  const [numVisibleUnits, setNumVisibleUnits] = useState(4);
  const [visibleTimeStart, setVisibleTimeStart] = useState(0);
  const [visibleDuration, setVisibleDuration] = useState(blockSizeSec);

  useEffect(() => {
    if (!spikeTrainsClient) return;
    setIsLoading(true);
    const load = async () => {
      // Round time start and duration to nearest block size
      const timeStart =
        Math.floor(visibleTimeStart / blockSizeSec) * blockSizeSec;
      const duration = Math.ceil(visibleDuration / blockSizeSec) * blockSizeSec;

      const visibleUnitsEnd = Math.min(
        visibleUnitsStart + numVisibleUnits,
        spikeTrainsClient.unitIds.length,
      );
      const unitIdsToView = spikeTrainsClient.unitIds.slice(
        visibleUnitsStart,
        visibleUnitsEnd,
      );

      const x = await spikeTrainsClient.getData(
        Math.round(timeStart / blockSizeSec),
        Math.round((timeStart + duration) / blockSizeSec),
        {
          unitIds: unitIdsToView,
        },
      );

      const d: PlotData = {
        unitIds: [],
        spikeTimes: [],
        startTime: timeStart,
        duration: duration,
        totalNumUnits: spikeTrainsClient.unitIds.length,
      };

      for (const a of x) {
        d.unitIds.push(a.unitId.toString());
        d.spikeTimes.push(a.spikeTimesSec);
      }
      setPlotData(d);
      setIsLoading(false);
    };
    load().catch(() => {
      setIsLoading(false);
    });
  }, [
    spikeTrainsClient,
    visibleUnitsStart,
    numVisibleUnits,
    visibleTimeStart,
    visibleDuration,
  ]);

  const handleIncreaseUnits = () => {
    if (!spikeTrainsClient) return;
    const newNumUnits = Math.min(
      numVisibleUnits * 2,
      spikeTrainsClient.unitIds.length - visibleUnitsStart,
    );
    setNumVisibleUnits(newNumUnits);
  };

  const handleDecreaseUnits = () => {
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
    setVisibleDuration(visibleDuration * 2);
  };

  const handleDecreaseVisibleDuration = () => {
    setVisibleDuration(Math.max(blockSizeSec, Math.floor(visibleDuration / 2)));
  };

  const handleShiftTimeLeft = () => {
    const timeShift = visibleDuration;
    setVisibleTimeStart(Math.max(0, visibleTimeStart - timeShift));
  };

  const handleShiftTimeRight = () => {
    setVisibleTimeStart(visibleTimeStart + visibleDuration);
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
                visibleUnitsStart + numVisibleUnits * 2 > plotData.totalNumUnits
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
              Showing {visibleDuration.toFixed(1)} sec starting at{" "}
              {visibleTimeStart.toFixed(1)} sec
            </span>
            <button
              onClick={handleDecreaseVisibleDuration}
              disabled={visibleDuration <= blockSizeSec}
              style={{
                padding: "2px 6px",
                border: "1px solid #ccc",
                borderRadius: "2px",
                fontSize: "0.85rem",
                backgroundColor:
                  visibleDuration <= blockSizeSec ? "#f5f5f5" : "white",
                cursor: visibleDuration <= blockSizeSec ? "default" : "pointer",
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
              disabled={visibleTimeStart <= 0}
              style={{
                padding: "2px 6px",
                border: "1px solid #ccc",
                borderRadius: "2px",
                fontSize: "0.85rem",
                backgroundColor: visibleTimeStart <= 0 ? "#f5f5f5" : "white",
                cursor: visibleTimeStart <= 0 ? "default" : "pointer",
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
    useState<DirectSpikeTrainsClient | null>(null);

  useEffect(() => {
    const create = async () => {
      const client = await DirectSpikeTrainsClient.create(
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
