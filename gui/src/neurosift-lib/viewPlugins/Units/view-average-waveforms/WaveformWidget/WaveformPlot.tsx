import { matrix } from "mathjs";
import { useMemo } from "react";
import { AffineTransform } from "../../../../misc/AffineTransform";
import {
  BaseCanvas,
  TransformationMatrix,
  transformPoints,
  Vec2,
} from "./sharedDrawnComponents/figurl-canvas";
import {
  LayoutMode,
  PixelSpaceElectrode,
} from "./sharedDrawnComponents/ElectrodeGeometry";

export type WaveformColors = {
  base: string;
};
// const defaultWaveformColors: WaveformColors = {
//     base: 'black'
// }

export type WaveformPoint = {
  amplitude: number;
  time: number;
};

export type WaveformProps = {
  electrodes: PixelSpaceElectrode[];
  waveforms: {
    electrodeIndices: number[];
    waveform: number[][];
    waveformStdDev?: number[][];
    waveformColors: WaveformColors;
  }[];
  waveformWidth: number;
  oneElectrodeWidth: number;
  oneElectrodeHeight: number;
  yScale: number;
  horizontalStretchFactor: number;
  width: number;
  height: number;
  layoutMode?: LayoutMode;
  affineTransform?: AffineTransform;
  useUnitColors: boolean;
};

type PixelSpacePath = {
  pointsInPaintBox: Vec2[];
  offsetFromParentCenter: Vec2;
  color: string;
};

type PaintProps = {
  waveformWidth: number;
  pixelSpacePaths: PixelSpacePath[];
  pixelSpacePathsLower?: PixelSpacePath[];
  pixelSpacePathsUpper?: PixelSpacePath[];
  xMargin: number;
  affineTransform?: AffineTransform;
  useUnitColors: boolean;
};

const computePaths = (
  transform: TransformationMatrix,
  waveforms: {
    electrodeIndices: number[];
    waveform: number[][];
    waveformStdDev?: number[][];
    waveformColors: WaveformColors;
  }[],
  electrodes: PixelSpaceElectrode[],
  mode: "normal" | "lower" | "upper",
  horizontalStretchFactor: number,
): PixelSpacePath[] => {
  // const pointsPerWaveform = waveforms.length > 0 ? waveforms[0].waveform.length > 0 ? waveforms[0].waveform[0].length : 0 : 0 // assumed constant across all
  // Flatten a list of waveforms (waveforms[i] = WaveformPoint[] = array of {time, amplitude}) to Vec2[] for vectorized point conversion
  // const rawPoints = waveforms.map(waveform => waveform.map(pt => [pt.time, pt.amplitude])).flat(1)
  // const pointsProjectedToElectrodeBox = transformPoints(transform, rawPoints)

  const ret: PixelSpacePath[] = [];
  electrodes.forEach((e, ii) => {
    for (const W of waveforms) {
      const jj = W.electrodeIndices.indexOf(ii);
      if (jj >= 0) {
        let ww: number[] | undefined;
        const wsd = W.waveformStdDev;
        if (mode === "normal") {
          ww = W.waveform[jj];
        } else if (mode === "lower") {
          ww = wsd
            ? W.waveform[jj].map((v, i) => W.waveform[jj][i] - wsd[jj][i])
            : undefined;
        } else if (mode === "upper") {
          ww = wsd
            ? W.waveform[jj].map((v, i) => W.waveform[jj][i] + wsd[jj][i])
            : undefined;
        }
        if (ww) {
          const points: Vec2[] = ww.map((amplitude, time) => [
            (ww?.length || 0) / 2 +
              (time - (ww?.length || 0) / 2) * horizontalStretchFactor,
            amplitude,
          ]);
          const pointsProjectedToElectrodeBox = transformPoints(
            transform,
            points,
          );
          ret.push({
            pointsInPaintBox: pointsProjectedToElectrodeBox,
            offsetFromParentCenter: [e.pixelX, e.pixelY],
            color: W.waveformColors.base,
          });
        }
      }
    }
  });
  return ret;
};

const paint = (ctxt: CanvasRenderingContext2D, props: PaintProps) => {
  const {
    pixelSpacePaths,
    pixelSpacePathsLower,
    pixelSpacePathsUpper,
    xMargin,
    waveformWidth,
    affineTransform,
    useUnitColors,
  } = props;
  if (!pixelSpacePaths || pixelSpacePaths.length === 0) return;

  ctxt.resetTransform();
  ctxt.clearRect(0, 0, ctxt.canvas.width, ctxt.canvas.height);

  ctxt.save();
  if (affineTransform) {
    const ff = affineTransform.forward;
    ctxt.transform(ff[0][0], ff[1][0], ff[0][1], ff[1][1], ff[0][2], ff[1][2]);
  }

  ctxt.translate(xMargin, 0);
  // ctxt.scale(1, yScale) // This would be a neat native way to adjust the vertical scaling, BUT it changes the pen aspect ratio.
  // So it doesn't work, alas. Leaving this comment here as a warning to future generations.
  const baseTransform = ctxt.getTransform();

  pixelSpacePathsLower &&
    pixelSpacePathsUpper &&
    pixelSpacePathsLower.forEach((p, ii) => {
      const pLower = pixelSpacePathsLower[ii];
      const pUpper = pixelSpacePathsUpper[ii];

      ctxt.fillStyle = "#dddddd";
      ctxt.strokeStyle = "#bbbbbb";
      ctxt.lineWidth = 1;
      ctxt.translate(
        pLower.offsetFromParentCenter[0],
        pLower.offsetFromParentCenter[1],
      );
      ctxt.beginPath();

      ctxt.moveTo(pLower.pointsInPaintBox[0][0], pLower.pointsInPaintBox[0][1]);
      for (let j = 0; j < pLower.pointsInPaintBox.length; j++) {
        ctxt.lineTo(
          pLower.pointsInPaintBox[j][0],
          pLower.pointsInPaintBox[j][1],
        );
      }
      for (let j = pUpper.pointsInPaintBox.length - 1; j >= 0; j--) {
        ctxt.lineTo(
          pUpper.pointsInPaintBox[j][0],
          pUpper.pointsInPaintBox[j][1],
        );
      }

      ctxt.fill();
      ctxt.stroke();
      ctxt.setTransform(baseTransform);
    });

  pixelSpacePaths.forEach((p) => {
    ctxt.strokeStyle = useUnitColors ? p.color : "black";
    ctxt.lineWidth = waveformWidth;
    ctxt.translate(p.offsetFromParentCenter[0], p.offsetFromParentCenter[1]);
    ctxt.beginPath();
    ctxt.moveTo(p.pointsInPaintBox[0][0], p.pointsInPaintBox[0][1]);
    p.pointsInPaintBox.forEach((pt) => {
      ctxt.lineTo(pt[0], pt[1]);
    });
    ctxt.stroke();
    ctxt.setTransform(baseTransform);
  });
  ctxt.restore();
  // Might be a good idea to do another ctxt.resetTransform() here to clear out any junk state
};

const WaveformPlot = (props: WaveformProps) => {
  const {
    electrodes,
    waveforms,
    oneElectrodeHeight,
    oneElectrodeWidth,
    yScale,
    horizontalStretchFactor,
    width,
    height,
    layoutMode,
    waveformWidth,
    affineTransform,
    useUnitColors,
  } = props;

  const canvas = useMemo(() => {
    const pointsPerWaveform =
      waveforms.length > 0
        ? waveforms[0].waveform.length > 0
          ? waveforms[0].waveform[0].length
          : 0
        : 0; // assumed constant across all
    const timeScale = oneElectrodeWidth / pointsPerWaveform; // converts the frame numbers (1..130 or w/e) to pixel width of electrode
    const offsetToCenter = -oneElectrodeWidth * (0.5 + 1 / pointsPerWaveform); // adjusts the waveforms to start at the left of the electrode, not its center
    const finalYScale = (yScale * oneElectrodeHeight) / 2; // scales waveform amplitudes to the pixel height of a single electrode
    // (...roughly. We'll exceed that height if the user dials up the scaling.)
    const transform = matrix([
      [timeScale, 0, offsetToCenter],
      [0, -finalYScale, 0],
      [0, 0, 1],
    ]).toArray() as TransformationMatrix;
    const paths = computePaths(
      transform,
      waveforms,
      electrodes,
      "normal",
      horizontalStretchFactor,
    );
    const pathsLower = computePaths(
      transform,
      waveforms,
      electrodes,
      "lower",
      horizontalStretchFactor,
    );
    const pathsUpper = computePaths(
      transform,
      waveforms,
      electrodes,
      "upper",
      horizontalStretchFactor,
    );
    // const pathsLower = waveformLowerPoints ? computePaths(transform, waveformLowerPoints, electrodes, horizontalStretchFactor) : undefined
    // const pathsUpper = waveformUpperPoints ? computePaths(transform, waveformUpperPoints, electrodes, horizontalStretchFactor) : undefined
    const xMargin =
      layoutMode === "vertical" ? (width - oneElectrodeWidth) / 2 : 0;

    const paintProps: PaintProps = {
      pixelSpacePaths: paths,
      pixelSpacePathsLower: pathsLower,
      pixelSpacePathsUpper: pathsUpper,
      xMargin: xMargin,
      waveformWidth,
      affineTransform,
      useUnitColors,
    };

    return (
      <BaseCanvas<PaintProps>
        width={width}
        height={height}
        draw={paint}
        drawData={paintProps}
      />
    );
  }, [
    waveforms,
    electrodes,
    yScale,
    width,
    height,
    oneElectrodeWidth,
    oneElectrodeHeight,
    layoutMode,
    waveformWidth,
    affineTransform,
    horizontalStretchFactor,
    useUnitColors,
  ]);

  return canvas;
};
// (Note: The transform matrix above could also be computed by funcToTransform.)
// The transform matrix combines two transforms: one maps waveform data into a roughly-unit-square system,
// and the other maps a unit-square to the pixel area of one electrode. Breaking those steps out looks like this:
// const wavesToUnitScale = matrix([[1/pointsPerWaveform,         0, -1/pointsPerWaveform],
//                                  [                  0, -yScale/2,                  0.5],
//                                  [                  0,         0,                    1]])
// const pointsToCentralBoxXfrm = matrix([[targetPixelW, 0,            0],
//                                        [0,            targetPixelH, 0],
//                                        [0,            0,            1]])
// const combinedTransform = multiply(pointsToCentralBoxXfrm, wavesToUnitScale).toArray() as TransformationMatrix
// but there's no need to actually make the computer do the math every time since we know what the result
// should be. (Also notice the -yScale term to invert the axis, since pixel Ys increase as you move downward.)

// Data-report functions for debugging:
// const sampleWaveformData = (waveforms?: WaveformPoint[][]): string => {
//     if (!waveforms) return ""
//     const firstWave = waveforms[0]
//     const start = firstWave.slice(0, 5).map(a => `${a.time}, ${a.amplitude}`)
//     const mid = firstWave.slice(70, 75).map(a => `${a.time}, ${a.amplitude}`)
//     const end = firstWave.slice(120, 125).map(a => `${a.time}, ${a.amplitude}`)
//     return [...start, ...mid, ...end].join('\n')
// }

// const samplePathData = (paths?: PixelSpacePath[]): string => {
//     if (!paths) return ""
//     const firstPath = paths[0]
//     const start = firstPath.pointsInPaintBox.slice(0, 5).map(a => `${a[0]}, ${a[1]}`)
//     const mid = firstPath.pointsInPaintBox.slice(70, 75).map(a => `${a[0]}, ${a[1]}`)
//     const end = firstPath.pointsInPaintBox.slice(120, 125).map(a => `${a[0]}, ${a[1]}`)
//     const displacement = `adjust to ${firstPath.offsetFromParentCenter[0]}, ${firstPath.offsetFromParentCenter[1]}`
//     return [...start, ...mid, ...end, displacement].join('\n')
// }

// Note: This code is left as an example of the prior way of doing things, but it's not needed for anything
// (and also doesn't work properly for vertical-layout.)
// const computePathsViaElectrodeTransforms = (waveforms: WaveformPoint[][], electrodes: PixelSpaceElectrode[], yScale: number): PixelSpacePath[] => {
//     // Each electrode's transform maps the unit square into pixelspace. So we need to normalize the waveform's time (x) dimension
//     // into unit distance. (The y dimension will already be accounted for by noise-scaling factors.)
//     const xrange = waveforms[0].length
//     const wavesToUnits = matrix([[1/xrange,  0,        -1/xrange],
//                                  [ 0,       -yScale/2,       0.5],
//                                  [ 0,        0,                1]])
//     // (The funcToTransform equivalent):
//     // const wavesToUnits = funcToTransform(p => {
//     //     return [p[0] / xrange, 0.5 - (p[1] /2) * yScale]
//     // })

//     return electrodes.map((e, ii) => {
//         const rawPoints = waveforms[ii].map(pt => [pt.time, pt.amplitude])
//         const electrodeBaseTransform = matrix(e.transform)
//         const newTransform = multiply(electrodeBaseTransform, wavesToUnits).toArray() as TransformationMatrix

//         const points = transformPoints(newTransform, rawPoints)
//         return {
//             pointsInPaintBox: points,
//             offsetFromParentCenter: [e.pixelX, e.pixelY]
//         }
//     })
// }

// const paintViaElectrodeTransforms = (props: PaintProps) => {
//     const { canvasRef, waveformOpts, pixelSpacePaths } = props

//     if (!pixelSpacePaths || pixelSpacePaths.length === 0) return
//     if (!canvasRef || typeof canvasRef === 'function') return
//     const canvas = canvasRef.current
//     const ctxt = canvas && canvas.getContext('2d')
//     if (!ctxt) return

//     const colors = waveformOpts?.colors || defaultWaveformColors
//     ctxt.strokeStyle = colors.base
//     ctxt.lineWidth = waveformOpts?.waveformWidth ?? 1
//     ctxt.clearRect(0, 0, ctxt.canvas.width, ctxt.canvas.height)
//     pixelSpacePaths.forEach((p) => {
//         ctxt.beginPath()
//         ctxt.moveTo(p.pointsInPaintBox[0][0], p.pointsInPaintBox[0][1])
//         p.pointsInPaintBox.forEach((pt) => {
//             ctxt.lineTo(pt[0], pt[1])
//         })
//         ctxt.stroke()
//     })
// }

export default WaveformPlot;
