import {
  canStepFrame,
  clampFrameIndex,
  framesToRead,
  steppedFrameIndex,
} from "./frameStepping";
import { FrameBlocks } from "./frameBlocks";
import {
  IconButton,
  ImageZoom,
  LoadingState,
  Playback,
  RangeSlider,
  Slider,
  ViewPanel,
  type ImageZoomValue,
} from "@ui";
import { TIME_VIEW_CHROME, TIME_VIEW_INSET } from "../../common/TimeView";
import { framesDue } from "../../common/playback";
import { onSpace, usePlaybackClock } from "../../common/usePlayback";
import "../../common/TimeView.css";
import "./TwoPhotonSeriesItemView.css";
import { getHdf5DatasetData, useHdf5Dataset } from "@hdf5Interface";
import { Canceler, DatasetDataType } from "@remote-h5-file";
import { useTimeseriesSelection } from "@shared/context-timeseries-selection-2";
import TimeseriesSelectionBar, {
  timeSelectionBarHeight,
} from "@shared/TimeseriesSelectionBar/TimeseriesSelectionBar";
import { useTimeseriesTimestampsClient } from "@shared/TimeseriesTimestampsClient/TimeseriesTimestampsClient";
import { FunctionComponent, useEffect, useMemo, useRef, useState } from "react";
import PlaneTransformSelector from "../../ImageSegmentation/ImageSegmentationItemView/PlaneTransformSelector";
import {
  defaultPlaneTransform,
  type PlaneTransform,
} from "../../ImageSegmentation/ImageSegmentationItemView/planeTransform";

// const queryParams = parseQuery(window.location.href)

type Props = {
  width: number;
  height: number;
  nwbUrl: string;
  path: string;
  condensed?: boolean;
  rgb?: boolean;
  initialBrightnessFactor?: number;
  showOrientationControls?: boolean;
  throttleMsec?: number;
};

type ImageData = {
  width: number;
  height: number;
  numPlanes: number;
  data: DatasetDataType;
};

export const TwoPhotonSeriesItemView: FunctionComponent<Props> = ({
  width,
  height,
  nwbUrl,
  path,
  rgb,
  initialBrightnessFactor,
  showOrientationControls,
  throttleMsec = 100,
}) => {
  const dataDataset = useHdf5Dataset(nwbUrl, path + "/data");

  const [currentImage, setCurrentImage] = useState<ImageData | undefined>(
    undefined,
  );
  const timeseriesTimestampsClient = useTimeseriesTimestampsClient(
    nwbUrl,
    path,
  );

  const { currentTime: currentTimeSource, setCurrentTime } =
    useTimeseriesSelection();
  const playback = usePlaybackClock((seconds) => advanceFrames(seconds));
  const currentTime = useThrottledState(
    currentTimeSource,
    playback.playing ? 0 : throttleMsec,
  );

  const { initializeTimeseriesSelection } = useTimeseriesSelection();
  useEffect(() => {
    if (!timeseriesTimestampsClient) return;
    if (timeseriesTimestampsClient.startTime === undefined) return;
    if (timeseriesTimestampsClient.endTime === undefined) return;
    initializeTimeseriesSelection({
      startTimeSec: timeseriesTimestampsClient.startTime,
      endTimeSec: timeseriesTimestampsClient.endTime,
    });
  }, [timeseriesTimestampsClient, initializeTimeseriesSelection]);
  useEffect(() => {
    if (!timeseriesTimestampsClient) return;
    setCurrentTime(timeseriesTimestampsClient.startTime!);
  }, [timeseriesTimestampsClient, setCurrentTime]);

  const [currentPlane, setCurrentPlane] = useState<number>(0); // -1 means RGB
  const [currentMinValue, setCurrentMinValue] = useState<number | undefined>(
    undefined,
  );
  const [currentMaxValue, setCurrentMaxValue] = useState<number | undefined>(
    undefined,
  );

  const [planeTransform, setPlaneTransform] = useState(defaultPlaneTransform);
  const [zoom, setZoom] = useState<ImageZoomValue>("fit");

  useEffect(() => {
    if (rgb) return;
    setCurrentPlane(Math.floor((dataDataset?.shape[3] || 1) / 2));
  }, [dataDataset, rgb]);

  useEffect(() => {
    if (rgb) {
      setCurrentPlane(-1);
    }
  }, [rgb]);

  const [loading, setLoading] = useState(false);
  const [shownFrame, setShownFrame] = useState<number>();
  const readAhead = useRef(1);
  const rate = timeseriesTimestampsClient?.estimatedSamplingFrequency;
  useEffect(() => {
    readAhead.current = framesToRead(
      playback.playing,
      rate,
      Number(playback.speed),
    );
  }, [playback.playing, playback.speed, rate]);
  const frameBlocks = useMemo(() => {
    if (!dataDataset || dataDataset.shape.length < 3) return undefined;
    const [frames, h, w, planes = 1] = dataDataset.shape;
    return new FrameBlocks(
      async (start, end) => {
        const block = await getHdf5DatasetData(nwbUrl, dataDataset.path, {
          slice: [[start, end]],
        });
        if (!block)
          throw Error(`Unable to read data from nwb file: ${dataDataset.path}`);
        return block;
      },
      h * w * planes,
      frames,
    );
  }, [nwbUrl, dataDataset]);

  const [frameIndex, setFrameIndex] = useState<number | undefined>(undefined);
  useEffect(() => {
    if (currentTime === undefined) return undefined;
    if (!timeseriesTimestampsClient) return undefined;
    let canceled = false;
    (async () => {
      const i1 =
        await timeseriesTimestampsClient?.getDataIndexForTime(currentTime);
      if (canceled) return;
      setFrameIndex(i1);
    })();
    return () => {
      canceled = true;
    };
  }, [currentTime, timeseriesTimestampsClient]);

  useEffect(() => {
    setLoading(true);
    if (!dataDataset) return;
    if (dataDataset.shape.length !== 3 && dataDataset.shape.length !== 4) {
      console.warn(
        "Unsupported shape for data dataset: " + dataDataset.shape.join(", "),
      );
      return;
    }
    // const N1 = dataDataset.shape[0]
    const N2 = dataDataset.shape[1];
    const N3 = dataDataset.shape[2];
    const numPlanes = dataDataset.shape.length === 4 ? dataDataset.shape[3] : 1;
    const canceler: Canceler = { onCancel: [] };
    let canceled = false;
    const load = async () => {
      if (frameIndex === undefined) return;
      // read from nwb file
      // const slice = [[frameIndex, frameIndex + 1], [0, N2], [0, N3]] as [number, number][]
      const x =
        readAhead.current > 1 && frameBlocks
          ? await frameBlocks.get(frameIndex, readAhead.current)
          : await getHdf5DatasetData(nwbUrl, dataDataset.path, {
              slice: [[frameIndex, frameIndex + 1]],
              canceler,
            });
      if (canceled) return;
      if (!x)
        throw Error(`Unable to read data from nwb file: ${dataDataset.path}`);

      const imageData = transformImageData(
        {
          width: N3,
          height: N2,
          numPlanes,
          data: x,
        },
        planeTransform,
      );

      setCurrentImage(imageData);
      setShownFrame(frameIndex);
      setLoading(false);
    };
    load();
    return () => {
      canceler.onCancel.forEach((f: () => void) => f());
      canceled = true;
    };
  }, [
    dataDataset,
    nwbUrl,
    frameIndex,
    timeseriesTimestampsClient,
    planeTransform,
    frameBlocks,
  ]);

  const [maxDataValue, setMaxDataValue] = useState<number | undefined>(
    undefined,
  );
  useEffect(() => {
    if (!currentImage) return;
    const max = maximum(currentImage.data);
    setMaxDataValue((v) => Math.max(v || 0, max));
  }, [currentImage]);

  const numFrames = dataDataset?.shape[0];

  const goToFrame = useMemo(
    () => (i2: number) => {
      (async () => {
        if (!timeseriesTimestampsClient) return;
        const tt = await timeseriesTimestampsClient.getTimestampsForDataIndices(
          i2,
          i2 + 1,
        );
        if (!tt) {
          throw Error("Unexpected: unable to get timestamps for data indices");
        }
        setCurrentTime(tt[0]);
      })().catch((err) => {
        console.error("Unable to step to the next frame:", err);
      });
    },
    [timeseriesTimestampsClient, setCurrentTime],
  );
  const incrementFrame = (inc: number) => {
    playback.setPlaying(false);
    const i2 = steppedFrameIndex(frameIndex, inc, numFrames);
    if (i2 !== undefined) goToFrame(i2);
  };

  // Playback asks for the frame now due and holds until it is drawn.
  const requested = useRef<number>();
  const carry = useRef(0);
  function advanceFrames(seconds: number) {
    if (shownFrame === undefined || numFrames === undefined || !rate)
      return true;
    const due = framesDue(carry.current, seconds, rate);
    carry.current = due.carry;
    if (due.steps === 0) return true;
    const next = clampFrameIndex(shownFrame + due.steps, numFrames);
    requested.current = next;
    playback.hold(true);
    goToFrame(next);
    return next < numFrames - 1;
  }
  const { playing, setPlaying, hold } = playback;
  useEffect(() => {
    if (!playing) {
      requested.current = undefined;
      carry.current = 0;
      hold(false);
      return;
    }
    if (requested.current === undefined) return;
    if (frameIndex !== undefined && frameIndex !== requested.current) {
      setPlaying(false);
      return;
    }
    hold(shownFrame !== requested.current);
  }, [playing, frameIndex, shownFrame, setPlaying, hold]);
  const play = (next: boolean) => {
    if (next && numFrames !== undefined && shownFrame === numFrames - 1)
      goToFrame(0);
    setPlaying(next);
  };

  useEffect(() => {
    if (currentMaxValue !== undefined) return;
    if (maxDataValue === undefined) return;
    setCurrentMinValue(0);
    setCurrentMaxValue(maxDataValue / (initialBrightnessFactor || 1));
  }, [currentMaxValue, maxDataValue, initialBrightnessFactor]);

  const frameCount = numFrames ?? dataDataset?.shape[0];
  const [, frameH, frameW] = dataDataset?.shape ?? [];
  const numPlanes = dataDataset?.shape[3] || 1;
  const n = (x: number) => x.toLocaleString("en-US");
  const summary = [
    frameCount !== undefined && `${n(frameCount)} frames`,
    frameW !== undefined &&
      frameH !== undefined &&
      `${n(frameW)} × ${n(frameH)} px`,
    dataDataset?.dtype,
  ]
    .filter(Boolean)
    .join(" · ");
  const plotHeight = height - timeSelectionBarHeight - TIME_VIEW_CHROME;
  const imageSize = Math.max(Math.min(plotHeight, width / 2), 200);

  return (
    <ViewPanel
      label={path.split("/").pop() || path}
      summary={summary}
      busy={loading}
      controls={
        <>
          <Playback
            playing={playing}
            onPlayingChange={play}
            speed={playback.speed}
            onSpeedChange={playback.setSpeed}
            time={currentTime ?? 0}
            readout={
              frameIndex !== undefined && frameCount !== undefined
                ? `Frame ${n(frameIndex + 1)} of ${n(frameCount)}`
                : "Frame —"
            }
            waiting={playback.waiting}
          />
          <div className="ns-time-group" role="group" aria-label="Frame">
            <IconButton
              icon="chevron--left"
              label="Previous frame"
              size="sm"
              disabled={!canStepFrame(frameIndex, -1, numFrames)}
              onClick={() => incrementFrame(-1)}
            />
            <IconButton
              icon="chevron--right"
              label="Next frame"
              size="sm"
              disabled={!canStepFrame(frameIndex, 1, numFrames)}
              onClick={() => incrementFrame(1)}
            />
          </div>
          {!rgb && numPlanes > 1 && (
            <div className="imaging-slider">
              <Slider
                label="Plane"
                min={0}
                max={numPlanes - 1}
                step={1}
                showValue
                value={currentPlane}
                onChange={setCurrentPlane}
              />
            </div>
          )}
          <div className="imaging-slider">
            <RangeSlider
              label="Display range"
              min={0}
              max={maxDataValue || 1}
              step={1}
              showValue
              showField={false}
              value={[currentMinValue || 0, currentMaxValue || 0]}
              onChange={([lo, hi]) => {
                setCurrentMinValue(lo);
                setCurrentMaxValue(hi);
              }}
            />
          </div>
        </>
      }
      overview={
        <div className="imaging-overview">
          <TimeseriesSelectionBar
            width={width - TIME_VIEW_INSET}
            height={timeSelectionBarHeight - 5}
            hideVisibleTimeRange={true}
          />
        </div>
      }
    >
      <div className="imaging-frame">
        {currentImage ? (
          <ImageZoom
            label={`${path.split("/").pop() || path}. Space plays and pauses`}
            width={currentImage.width}
            height={currentImage.height}
            value={zoom}
            onChange={setZoom}
            viewWidth={imageSize}
            viewHeight={imageSize}
            onKeyDown={onSpace(() => play(!playing))}
          >
            <ImageDataView
              imageData={currentImage}
              currentPlane={currentPlane}
              minValue={currentMinValue || 0}
              maxValue={currentMaxValue || 1}
            />
          </ImageZoom>
        ) : (
          <LoadingState
            label={`Loading frame ${n((frameIndex ?? 0) + 1)}`}
            phase="loading"
          />
        )}
        {showOrientationControls !== false && (
          <PlaneTransformSelector
            planeTransform={planeTransform}
            setPlaneTransform={setPlaneTransform}
          />
        )}
      </div>
    </ViewPanel>
  );
};

type ImageDataViewProps = {
  imageData: ImageData;
  currentPlane: number; // -1 means rgb
  minValue: number;
  maxValue: number;
};

/** The frame at its own size; ImageZoom scales it. */
const ImageDataView: FunctionComponent<ImageDataViewProps> = ({
  imageData,
  currentPlane,
  minValue,
  maxValue,
}) => {
  const { width: W, height: H, numPlanes, data } = imageData;
  const [canvasElement, setCanvasElement] = useState<
    HTMLCanvasElement | undefined
  >(undefined);
  useEffect(() => {
    if (!canvasElement) return;
    const ctx = canvasElement.getContext("2d");
    if (!ctx) return;

    const transformValue = (v: number) => {
      return Math.max(0, Math.min(1, (v - minValue) / (maxValue - minValue)));
    };

    if (!W || !H) {
      console.warn("Unexpected: W or H is zero");
      return;
    }
    const imgData = ctx.createImageData(W, H);
    const buf = imgData.data;
    if (currentPlane >= 0) {
      for (let i = 0; i < W * H; i++) {
        const iii = i * numPlanes + currentPlane;
        const v = Math.min(255, Math.round(transformValue(data[iii]) * 255));
        buf[4 * i + 0] = v;
        buf[4 * i + 1] = v;
        buf[4 * i + 2] = v;
        buf[4 * i + 3] = 255;
      }
    } else {
      // rgb
      for (let i = 0; i < W * H; i++) {
        const iii = i * numPlanes;
        buf[4 * i + 0] = Math.min(
          255,
          Math.round(transformValue(data[iii]) * 255),
        );
        buf[4 * i + 1] = Math.min(
          255,
          Math.round(transformValue(data[iii + 1]) * 255),
        );
        buf[4 * i + 2] = Math.min(
          255,
          Math.round(transformValue(data[iii + 2]) * 255),
        );
        buf[4 * i + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);
  }, [W, H, data, canvasElement, minValue, maxValue, numPlanes, currentPlane]);
  return (
    <canvas
      ref={(elmt) => elmt && setCanvasElement(elmt)}
      width={W}
      height={H}
    />
  );
};

const maximum = (x: DatasetDataType): number => {
  let max = -Infinity;
  for (let i = 0; i < x.length; i++) {
    max = Math.max(max, x[i]);
  }
  return max;
};

// const readDataFromDat = async (
//   url: string,
//   offset: number,
//   length: number,
//   dtype: string,
// ): Promise<DatasetDataType> => {
//   let dt = "";
//   if (dtype === "<h") dt = "int16";
//   else if (dtype === "<i") dt = "int32";
//   else if (dtype === "<f") dt = "float32";
//   else if (dtype === "<d") dt = "float64";
//   else dt = dtype;

//   let numBytesPerElement = 0;
//   if (dt === "int16") numBytesPerElement = 2;
//   else if (dt === "int32") numBytesPerElement = 4;
//   else if (dt === "float32") numBytesPerElement = 4;
//   else if (dt === "float64") numBytesPerElement = 8;
//   else throw Error(`Unexpected dtype: ${dtype}`);

//   const startByte = offset * numBytesPerElement;
//   const endByte = (offset + length) * numBytesPerElement;

//   const response = await fetch(url, {
//     headers: {
//       Range: `bytes=${startByte}-${endByte - 1}`,
//     },
//   });

//   const buf = await response.arrayBuffer();
//   if (dt === "int16") {
//     return new Int16Array(buf);
//   } else if (dt === "int32") {
//     return new Int32Array(buf);
//   } else if (dt === "float32") {
//     return new Float32Array(buf);
//   } else if (dt === "float64") {
//     return new Float64Array(buf);
//   } else {
//     throw Error(`Unexpected dtype: ${dtype}`);
//   }
// };

// function parseQuery(queryString: string) {
//     const ind = queryString.indexOf('?')
//     if (ind <0) return {}
//     const query: {[k: string]: string} = {};
//     const pairs = queryString.slice(ind + 1).split('&');
//     for (let i = 0; i < pairs.length; i++) {
//         const pair = pairs[i].split('=');
//         query[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1] || '');
//     }
//     return query;
// }

const transformImageData = (
  imageData: ImageData,
  planeTransform: PlaneTransform,
) => {
  const { xyswap, xflip, yflip } = planeTransform;
  const { width, height, numPlanes, data } = imageData;
  if (!xyswap && !xflip && !yflip) return imageData;
  const N = width * height * numPlanes;
  const NN = width * height;
  const newWidth = xyswap ? height : width;
  const newHeight = xyswap ? width : height;
  const data2 = new Float32Array(N);
  if (xyswap) {
    for (let i = 0; i < NN; i++) {
      let newY = i % width;
      let newX = Math.floor(i / width);
      if (xflip) newX = newWidth - 1 - newX;
      if (yflip) newY = newHeight - 1 - newY;
      const j = newX + newY * newWidth;
      for (let k = 0; k < numPlanes; k++) {
        data2[j * numPlanes + k] = data[i * numPlanes + k];
      }
    }
  } else {
    for (let i = 0; i < NN; i++) {
      let newY = Math.floor(i / width);
      let newX = i % width;
      if (xflip) newX = newWidth - 1 - newX;
      if (yflip) newY = newHeight - 1 - newY;
      const j = newX + newY * newWidth;
      for (let k = 0; k < numPlanes; k++) {
        data2[j * numPlanes + k] = data[i * numPlanes + k];
      }
    }
  }

  return {
    width: newWidth,
    height: newHeight,
    numPlanes,
    data: data2,
  };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function useThrottledState(value: any, delay: number) {
  const [throttledValue, setThrottledValue] = useState(value);
  const lastUpdateTimeRef = useRef(Date.now());
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const timeoutRef = useRef<any>(null);

  useEffect(() => {
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateTimeRef.current;

    // If enough time has passed, update immediately
    if (timeSinceLastUpdate >= delay) {
      setThrottledValue(value);
      lastUpdateTimeRef.current = now;
    } else {
      // Otherwise, set a timeout to update after the remaining time
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        setThrottledValue(value);
        lastUpdateTimeRef.current = Date.now();
      }, delay - timeSinceLastUpdate);
    }

    return () => {
      // Clear timeout on cleanup
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, delay]);

  return throttledValue;
}

export default TwoPhotonSeriesItemView;
