import { FunctionComponent, useCallback, useMemo, useState } from "react";
import {
  AffineTransform,
  applyAffineTransform,
  createAffineTransform,
  identityAffineTransform,
  inverseAffineTransform,
  multAffineTransforms,
} from "../../../../misc/AffineTransform";
import ElectrodeGeometry, {
  Electrode,
  LayoutMode,
} from "./sharedDrawnComponents/ElectrodeGeometry";
import {
  computeElectrodeLocations,
  xMargin as xMarginDefault,
} from "./sharedDrawnComponents/electrodeGeometryLayout";
import { ElectrodeColors } from "./sharedDrawnComponents/electrodeGeometryPainting";
import { getSpikeAmplitudeNormalizationFactor } from "./waveformLogic";
import WaveformPlot, { WaveformColors } from "./WaveformPlot";

export type WaveformOpts = {
  colors?: WaveformColors;
  waveformWidth: number;
  showChannelIds: boolean;
  useUnitColors: boolean;
};

export type WaveformWidgetProps = {
  waveforms: {
    electrodeIndices: number[];
    waveform: number[][];
    waveformStdDev?: number[][];
    waveformColors: WaveformColors;
  }[];
  ampScaleFactor: number;
  horizontalStretchFactor: number;
  electrodes: Electrode[];
  layoutMode: LayoutMode;
  hideElectrodes: boolean;
  width: number;
  height: number;
  colors?: ElectrodeColors;
  showLabels?: boolean;
  peakAmplitude: number;
  samplingFrequency?: number;
  showChannelIds: boolean;
  useUnitColors: boolean;
  waveformWidth: number;
  disableAutoRotate?: boolean;
};

const electrodeColors: ElectrodeColors = {
  border: "rgb(120, 100, 120)",
  base: "rgb(240, 240, 240)",
  selected: "rgb(196, 196, 128)",
  hover: "rgb(128, 128, 255)",
  selectedHover: "rgb(200, 200, 196)",
  dragged: "rgb(0, 0, 196)",
  draggedSelected: "rgb(180, 180, 150)",
  dragRect: "rgba(196, 196, 196, 0.5)",
  textLight: "rgb(162, 162, 162)",
  textDark: "rgb(32, 150, 150)",
};
const waveformColors: WaveformColors = {
  base: "black",
};

const defaultElectrodeOpts = {
  colors: electrodeColors,
  showLabels: false,
};

export const defaultWaveformOpts: WaveformOpts = {
  colors: waveformColors,
  waveformWidth: 2,
  showChannelIds: true,
  useUnitColors: true,
};

// TODO: FIX AVG WAVEFORM NUMPY VIEW
// TODO: FIX SNIPPET BOX
const WaveformWidget: FunctionComponent<WaveformWidgetProps> = (props) => {
  const colors = props.colors ?? defaultElectrodeOpts.colors;
  const {
    electrodes,
    waveforms,
    ampScaleFactor: userSpecifiedAmplitudeScaling,
    horizontalStretchFactor,
    layoutMode,
    hideElectrodes,
    width,
    height,
    showChannelIds,
    useUnitColors,
    waveformWidth,
    disableAutoRotate,
  } = props;

  const maxElectrodePixelRadius = 1000;

  const { handleWheel, affineTransform } = useWheelZoom(width, height, {
    shift: true,
    alt: true,
  });

  const geometry = useMemo(
    () => (
      <ElectrodeGeometry
        electrodes={electrodes}
        width={width}
        height={height}
        layoutMode={layoutMode}
        colors={colors}
        showLabels={showChannelIds} // Would we ever not want to show labels for this?
        // offsetLabels={true}  // this isn't appropriate for a waveform view--it mislabels the electrodes
        // maxElectrodePixelRadius={defaultMaxPixelRadius}
        maxElectrodePixelRadius={maxElectrodePixelRadius}
        disableSelection={true} // ??
        disableAutoRotate={disableAutoRotate}
        affineTransform={affineTransform}
      />
    ),
    [
      electrodes,
      width,
      height,
      layoutMode,
      colors,
      showChannelIds,
      disableAutoRotate,
      affineTransform,
    ],
  );

  // TODO: Don't do this twice, work it out differently
  const {
    convertedElectrodes,
    pixelRadius,
    xMargin: xMarginBase,
  } = computeElectrodeLocations(
    width,
    height,
    electrodes,
    layoutMode,
    maxElectrodePixelRadius,
    { disableAutoRotate },
  );
  const xMargin = xMarginBase || xMarginDefault;

  // Spikes are defined as being some factor greater than the baseline noise.
  const amplitudeNormalizationFactor = useMemo(
    () => getSpikeAmplitudeNormalizationFactor(props.peakAmplitude),
    [props.peakAmplitude],
  );
  const yScaleFactor = useMemo(
    () => userSpecifiedAmplitudeScaling * amplitudeNormalizationFactor,
    [userSpecifiedAmplitudeScaling, amplitudeNormalizationFactor],
  );

  // TODO: THIS LOGIC PROBABLY SHOULDN'T BE REPEATED HERE AND IN THE ELECTRODE GEOMETRY PAINT FUNCTION
  const oneElectrodeHeight =
    layoutMode === "geom" ? pixelRadius * 2 : height / electrodes.length;
  const oneElectrodeWidth =
    layoutMode === "geom"
      ? pixelRadius * 2
      : width - xMargin - (showChannelIds ? 2 * pixelRadius : 0);
  const waveformPlot = (
    <WaveformPlot
      electrodes={convertedElectrodes}
      waveforms={waveforms}
      oneElectrodeHeight={oneElectrodeHeight}
      oneElectrodeWidth={oneElectrodeWidth}
      horizontalStretchFactor={horizontalStretchFactor}
      yScale={yScaleFactor}
      width={width}
      height={height}
      layoutMode={layoutMode}
      waveformWidth={waveformWidth}
      affineTransform={affineTransform}
      useUnitColors={useUnitColors}
    />
  );

  return (
    <div style={{ width, height, position: "relative" }} onWheel={handleWheel}>
      {!hideElectrodes && geometry}
      {waveformPlot}
    </div>
  );
};

export const useWheelZoom = (
  width: number,
  height: number,
  o: { shift?: boolean; alt?: boolean } = {},
) => {
  const shift = o.shift !== undefined ? o.shift : true;
  const alt = o.shift !== undefined ? o.alt : false;
  const [affineTransform, setAffineTransform] = useState<AffineTransform>(
    identityAffineTransform,
  );
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (shift && !e.shiftKey) return;
      if (!shift && e.shiftKey) return;
      if (alt && !e.altKey) return;
      if (!alt && e.altKey) return;
      const boundingRect = e.currentTarget.getBoundingClientRect();
      const point = {
        x: e.clientX - boundingRect.x,
        y: e.clientY - boundingRect.y,
      };
      const deltaY = e.deltaY;
      const scaleFactor = 1.3;
      let X = createAffineTransform([
        [scaleFactor, 0, (1 - scaleFactor) * point.x],
        [0, scaleFactor, (1 - scaleFactor) * point.y],
      ]);
      if (deltaY > 0) X = inverseAffineTransform(X);
      let newTransform = multAffineTransforms(X, affineTransform);
      // test to see if we should snap back to identity
      const p00 = applyAffineTransform(newTransform, { x: 0, y: 0 });
      const p11 = applyAffineTransform(newTransform, { x: width, y: height });
      if (0 <= p00.x && p00.x < width && 0 <= p00.y && p00.y < height) {
        if (0 <= p11.x && p11.x < width && 0 <= p11.y && p11.y < height) {
          newTransform = identityAffineTransform;
        }
      }

      setAffineTransform(newTransform);
      return false;
    },
    [affineTransform, height, width, shift, alt],
  );
  return {
    affineTransform,
    handleWheel,
  };
};

export default WaveformWidget;
