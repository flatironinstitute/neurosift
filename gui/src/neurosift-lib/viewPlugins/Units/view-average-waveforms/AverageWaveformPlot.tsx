import { FunctionComponent, useContext, useMemo } from "react";
import { TimeseriesSelectionContext } from "../../../contexts/context-timeseries-selection";
import { idToNum } from "../../../contexts/context-unit-selection";
import ElectrodeGeometry from "./WaveformWidget/sharedDrawnComponents/ElectrodeGeometry";
import { WaveformColors } from "./WaveformWidget/WaveformPlot";
import WaveformWidget from "./WaveformWidget/WaveformWidget";

export type AverageWaveformPlotProps = {
  allChannelIds: (number | string)[];
  channelIds: (number | string)[];
  units: {
    channelIds: (number | string)[];
    waveform: number[][];
    waveformStdDev?: number[][];
    waveformColor: string;
  }[];
  layoutMode: "geom" | "vertical";
  hideElectrodes: boolean;
  channelLocations?: { [key: string]: number[] };
  samplingFrequency?: number;
  peakAmplitude: number;
  ampScaleFactor: number;
  horizontalStretchFactor: number;
  showChannelIds: boolean;
  useUnitColors: boolean;
  width: number;
  height: number;
  showReferenceProbe?: boolean;
  disableAutoRotate?: boolean;
};

const AverageWaveformPlot: FunctionComponent<AverageWaveformPlotProps> = ({
  allChannelIds,
  channelIds,
  units,
  layoutMode,
  hideElectrodes,
  channelLocations,
  samplingFrequency,
  peakAmplitude,
  ampScaleFactor,
  horizontalStretchFactor,
  showChannelIds,
  useUnitColors,
  showReferenceProbe,
  disableAutoRotate,
  width,
  height,
}) => {
  const electrodes = useMemo(() => {
    const locs = channelLocations || {};
    return channelIds.map((channelId) => ({
      id: channelId,
      label: `${channelId}`,
      x:
        locs[`${channelId}`] !== undefined
          ? locs[`${channelId}`][0]
          : idToNum(channelId),
      y: locs[`${channelId}`] !== undefined ? locs[`${channelId}`][1] : 0,
    }));
  }, [channelIds, channelLocations]);
  const allElectrodes = useMemo(() => {
    const locs = channelLocations || {};
    return allChannelIds.map((channelId) => ({
      id: channelId,
      label: `${channelId}`,
      x:
        locs[`${channelId}`] !== undefined
          ? locs[`${channelId}`][0]
          : idToNum(channelId),
      y: locs[`${channelId}`] !== undefined ? locs[`${channelId}`][1] : 0,
    }));
  }, [allChannelIds, channelLocations]);
  const referenceProbeWidth = width / 4;

  const waveforms = useMemo(
    () =>
      units.map((unit) => {
        const waveformColors: WaveformColors = {
          base: unit.waveformColor,
        };
        const electrodeIndices = [];
        for (const id of unit.channelIds) {
          electrodeIndices.push(electrodes.map((e) => e.id).indexOf(id));
        }
        return {
          electrodeIndices,
          waveform: unit.waveform,
          waveformStdDev: unit.waveformStdDev,
          waveformColors,
        };
      }),
    [electrodes, units],
  );

  const waveformWidget = (
    <WaveformWidget
      waveforms={waveforms}
      electrodes={electrodes}
      ampScaleFactor={ampScaleFactor}
      horizontalStretchFactor={horizontalStretchFactor}
      layoutMode={channelLocations ? layoutMode : "vertical"}
      hideElectrodes={hideElectrodes}
      width={showReferenceProbe ? width - referenceProbeWidth : width}
      height={height}
      showLabels={true} // for now
      peakAmplitude={peakAmplitude}
      samplingFrequency={samplingFrequency}
      showChannelIds={showChannelIds}
      useUnitColors={useUnitColors}
      waveformWidth={2}
      disableAutoRotate={disableAutoRotate}
    />
  );

  const { timeseriesSelection } = useContext(TimeseriesSelectionContext);

  const timeseriesSelectionProviderValue = useMemo(
    () => ({
      timeseriesSelection: {
        ...timeseriesSelection,
        selectedElectrodeIds: channelIds,
      },
      timeseriesSelectionDispatch: () => {},
    }),
    [timeseriesSelection, channelIds],
  );

  return showReferenceProbe ? (
    <div style={{ position: "relative", width, height }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: referenceProbeWidth,
          height,
        }}
      >
        <TimeseriesSelectionContext.Provider
          value={timeseriesSelectionProviderValue}
        >
          <ElectrodeGeometry
            electrodes={allElectrodes}
            disableSelection={false}
            width={referenceProbeWidth}
            height={height}
          />
        </TimeseriesSelectionContext.Provider>
      </div>
      <div
        style={{
          position: "absolute",
          left: referenceProbeWidth,
          top: 0,
          width: width - referenceProbeWidth,
          height,
        }}
      >
        {waveformWidget}
      </div>
    </div>
  ) : (
    waveformWidget
  );
};

export default AverageWaveformPlot;
