/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { SmallIconButton } from "@fi-sci/misc";
import {
  Canceler,
  DatasetDataType,
  RemoteH5FileX,
} from "../../remote-h5-file/index";
import { ArrowLeft, ArrowRight } from "@mui/icons-material";
import { FunctionComponent, useEffect, useMemo, useState } from "react";
import {
  useTimeRange,
  useTimeseriesSelection,
  useTimeseriesSelectionInitialization,
} from "../../contexts/context-timeseries-selection";
import { useNwbFile } from "../../misc/NwbFileContext";
import { useDataset } from "../../misc/hooks";
import { useTimeseriesTimestampsClient } from "../TimeSeries/TimeseriesItemView/TimeseriesTimestampsClient";
import TimeseriesSelectionBar, {
  timeSelectionBarHeight,
} from "../../timeseries/TimeseriesSelectionBar";
import MultiRangeSlider from "./MultiRangeSlider/MultiRangeSlider";
import PlaneTransformSelector, {
  PlaneTransform,
  defaultPlaneTransform,
} from "./PlaneTransformSelector";
import TabWidget from "../../components/TabWidget";
import TwoPhotonSeriesMovieView from "./TwoPhotonSeriesMovieView";

// const queryParams = parseQuery(window.location.href)

type Props = {
  width: number;
  height: number;
  path: string;
  condensed?: boolean;
  rgb?: boolean;
};

type ImageData = {
  width: number;
  height: number;
  numPlanes: number;
  data: DatasetDataType;
};

const useComputedDataDatUrl = (
  _nwbFile: RemoteH5FileX,
  _path: string | undefined,
) => {
  return undefined; // no longer used
  /*
    const [computedDataDatUrl, setComputedDataDatUrl] = useState<string | undefined>(undefined)
    useEffect(() => {
        let canceled = false
        const load = async () => {
            if (!path) return
            const etag = await getEtag(nwbFile.url)
            if (canceled) return
            if (!etag) return
            const nwbUrl = `https://neurosift.org/computed/nwb/ETag/${etag.slice(0, 2)}/${etag.slice(2, 4)}/${etag.slice(4, 6)}/${etag}`
            const datUrl = `${nwbUrl}/${path.slice(1)}.dat`
            const headResponse = await headRequest(datUrl)
            if (canceled) return
            if (!headResponse) return
            if (headResponse.status !== 200) return
            setComputedDataDatUrl(datUrl)
        }
        load()
        return () => {canceled = true}
    }, [nwbFile, path])
    return computedDataDatUrl
    */
};

const TwoPhotonSeriesItemView: FunctionComponent<Props> = ({
  width,
  height,
  path,
  rgb,
}) => {
  // const nwbFile = useNwbFile();
  // const [useMp4, setUseMp4] = useState<boolean | undefined>(undefined);
  // useEffect(() => {
  //   (async () => {
  //     if (!nwbFile) return;
  //     if (nwbFile instanceof RemoteH5FileLindi) {
  //       const zarray = await nwbFile.getLindiZarray(path + "/data");
  //       if (zarray?.compressor?.id === "mp4avc") {
  //         setUseMp4(true);
  //         return;
  //       }
  //     }
  //     setUseMp4(false);
  //   })();
  // }, [nwbFile, path]);
  // if (useMp4 === undefined) return <div>determining type...</div>;
  // if (useMp4) {
  //   return (
  //     <TwoPhotonSeriesItemViewMp4 width={width} height={height} path={path} />
  //   );
  // } else {
  const tabs = useMemo(() => {
    return [
      {
        id: "array",
        label: "Array",
        closeable: false,
      },
      {
        id: "movie",
        label: "Movie",
        closeable: false,
      },
    ];
  }, []);
  const [currentTabId, setCurrentTabId] = useState("array");
  return (
    <TabWidget
      tabs={tabs}
      width={width}
      height={height}
      currentTabId={currentTabId}
      setCurrentTabId={setCurrentTabId}
    >
      <TwoPhotonSeriesItemViewChild
        width={0}
        height={0}
        path={path}
        rgb={rgb}
      />
      <TwoPhotonSeriesMovieView width={0} height={0} path={path} />
    </TabWidget>
  );
};

export const TwoPhotonSeriesItemViewChild: FunctionComponent<Props> = ({
  width,
  height,
  path,
  rgb,
}) => {
  const nwbFile = useNwbFile();
  if (!nwbFile) throw Error("Unexpected: nwbFile is null");
  const dataDataset = useDataset(nwbFile, path + "/data");

  const [currentImage, setCurrentImage] = useState<ImageData | undefined>(
    undefined,
  );
  const timeseriesTimestampsClient = useTimeseriesTimestampsClient(
    nwbFile,
    path,
  );

  const { currentTime, setCurrentTime } = useTimeseriesSelection();
  const { setVisibleTimeRange } = useTimeRange();
  useTimeseriesSelectionInitialization(
    timeseriesTimestampsClient?.startTime,
    timeseriesTimestampsClient?.endTime,
  );
  useEffect(() => {
    if (!timeseriesTimestampsClient) return;
    setCurrentTime(timeseriesTimestampsClient.startTime!);
  }, [timeseriesTimestampsClient, setCurrentTime, setVisibleTimeRange]);

  const [currentPlane, setCurrentPlane] = useState<number>(0); // -1 means RGB
  const [currentMinValue, setCurrentMinValue] = useState<number | undefined>(
    undefined,
  );
  const [currentMaxValue, setCurrentMaxValue] = useState<number | undefined>(
    undefined,
  );

  const [planeTransform, setPlaneTransform] = useState(defaultPlaneTransform);

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

  const computedDataDatUrl = useComputedDataDatUrl(nwbFile, dataDataset?.path);

  // // determine whether to use precomputed data.dat or read from nwb file
  // let usePrecomputed: boolean
  // const isProbablyLocalDataset = nwbFile.url.startsWith('http://')
  // if (isProbablyLocalDataset) {
  //     usePrecomputed = false
  // }
  // else {
  //     if (queryParams.dev1 === '1') {
  //         usePrecomputed = false
  //     }
  //     else {
  //         usePrecomputed = true
  //     }
  // }
  const usePrecomputed = false;

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
      let x;
      if (usePrecomputed) {
        // read from computed data.dat
        if (!computedDataDatUrl) return;
        x = await readDataFromDat(
          computedDataDatUrl,
          frameIndex * N2 * N3,
          N2 * N3,
          dataDataset.dtype,
        );
      } else {
        // read from nwb file
        // const slice = [[frameIndex, frameIndex + 1], [0, N2], [0, N3]] as [number, number][]
        const slice = [[frameIndex, frameIndex + 1]] as [number, number][];
        x = await nwbFile.getDatasetData(dataDataset.path, { slice, canceler });
        if (!x)
          throw Error(`Unable to read data from nwb file: ${dataDataset.path}`);
      }

      if (canceled) return;

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
      setLoading(false);
    };
    load();
    return () => {
      canceler.onCancel.forEach((f) => f());
      canceled = true;
    };
  }, [
    dataDataset,
    usePrecomputed,
    nwbFile,
    computedDataDatUrl,
    frameIndex,
    timeseriesTimestampsClient,
    planeTransform,
  ]);

  const [maxDataValue, setMaxDataValue] = useState<number | undefined>(
    undefined,
  );
  useEffect(() => {
    if (!currentImage) return;
    const max = maximum(currentImage.data);
    setMaxDataValue((v) => Math.max(v || 0, max));
  }, [currentImage]);

  const bottomBarHeight = 30;

  const incrementFrame = useMemo(
    () => (inc: number) => {
      (async () => {
        if (!timeseriesTimestampsClient) return;
        if (frameIndex === undefined) return;
        const i1 = frameIndex;
        const i2 = i1 + inc;
        const tt = await timeseriesTimestampsClient.getTimestampsForDataIndices(
          i2,
          i2 + 1,
        );
        if (!tt) {
          throw Error("Unexpected: unable to get timestamps for data indices");
        }
        setCurrentTime(tt[0]);
      })();
    },
    [timeseriesTimestampsClient, frameIndex, setCurrentTime],
  );

  useEffect(() => {
    if (currentMaxValue !== undefined) return;
    if (maxDataValue === undefined) return;
    setCurrentMinValue(0);
    setCurrentMaxValue(maxDataValue);
  }, [currentMaxValue, maxDataValue]);

  return (
    <div style={{ position: "absolute", width, height }}>
      <div
        style={{ position: "absolute", width, height: timeSelectionBarHeight }}
      >
        <TimeseriesSelectionBar
          width={width}
          height={timeSelectionBarHeight - 5}
          hideVisibleTimeRange={true}
        />
      </div>
      <div
        style={{
          position: "absolute",
          top: timeSelectionBarHeight,
          width,
          height: height - timeSelectionBarHeight - bottomBarHeight,
        }}
      >
        {currentImage && !loading ? (
          <ImageDataView
            width={width}
            height={height - timeSelectionBarHeight - bottomBarHeight}
            imageData={currentImage}
            currentPlane={currentPlane}
            minValue={currentMinValue || 0}
            maxValue={currentMaxValue || 1}
          />
        ) : usePrecomputed ? (
          computedDataDatUrl ? (
            <div>loading...</div>
          ) : (
            <div>Unable to find pre-computed dataset</div>
          )
        ) : (
          <span>loading...</span>
        )}
      </div>
      <div
        style={{
          position: "absolute",
          top: height - bottomBarHeight,
          width,
          height: bottomBarHeight,
          display: "flex",
          overflow: "hidden",
        }}
      >
        <div style={{ position: "relative", top: 3 }}>
          <SmallIconButton
            disabled={
              (currentTime || 0) <= (timeseriesTimestampsClient?.startTime || 0)
            }
            onClick={() => incrementFrame(-1)}
            icon={<ArrowLeft />}
          />
          <SmallIconButton
            disabled={
              (currentTime || 0) >= (timeseriesTimestampsClient?.endTime || 0)
            }
            onClick={() => incrementFrame(1)}
            icon={<ArrowRight />}
          />
        </div>
        &nbsp;&nbsp;
        {!rgb && (
          <PlaneSelector
            currentPlane={currentPlane}
            setCurrentPlane={setCurrentPlane}
            numPlanes={dataDataset?.shape[3] || 1}
          />
        )}
        &nbsp;&nbsp;
        <ValueRangeSelector
          min={0}
          max={maxDataValue || 1}
          currentMinValue={currentMinValue}
          currentMaxValue={currentMaxValue}
          setCurrentMinValue={setCurrentMinValue}
          setCurrentMaxValue={setCurrentMaxValue}
        />
        &nbsp;&nbsp;
        <PlaneTransformSelector
          planeTransform={planeTransform}
          setPlaneTransform={setPlaneTransform}
        />
        &nbsp;&nbsp;
        {loading && (
          <div style={{ position: "relative", top: 7 }}>
            <span>&nbsp;&nbsp;loading...</span>
          </div>
        )}
      </div>
    </div>
  );
};

type ImageDataViewProps = {
  width: number;
  height: number;
  imageData: ImageData;
  currentPlane: number; // -1 means rgb
  minValue: number;
  maxValue: number;
};

const margins = { left: 10, right: 10, top: 10, bottom: 10 };

const ImageDataView: FunctionComponent<ImageDataViewProps> = ({
  width,
  height,
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

    const scale = Math.min(
      (width - margins.left - margins.right) / W,
      (height - margins.top - margins.bottom) / H,
    );
    const offsetX =
      margins.left + (width - margins.left - margins.right - W * scale) / 2;
    const offsetY =
      margins.top + (height - margins.top - margins.bottom - H * scale) / 2;

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
    const offscreenCanvas = document.createElement("canvas");
    offscreenCanvas.width = W;
    offscreenCanvas.height = H;
    const c = offscreenCanvas.getContext("2d");
    if (!c) return;
    c.putImageData(imgData, 0, 0);

    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(offscreenCanvas, offsetX, offsetY, W * scale, H * scale);
  }, [
    W,
    H,
    data,
    canvasElement,
    width,
    height,
    minValue,
    maxValue,
    numPlanes,
    currentPlane,
  ]);
  return (
    <canvas
      ref={(elmt) => elmt && setCanvasElement(elmt)}
      width={width}
      height={height}
      style={{ width, height }}
    />
  );
};

type PlaneSelectorProps = {
  currentPlane: number;
  setCurrentPlane: (plane: number) => void;
  numPlanes: number;
};

const PlaneSelector: FunctionComponent<PlaneSelectorProps> = ({
  currentPlane,
  setCurrentPlane,
  numPlanes,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentPlane(Number(e.target.value));
  };
  if (numPlanes <= 1) return <span />;
  return (
    <RangeInput
      label="Plane"
      min={0}
      max={numPlanes - 1}
      value={currentPlane}
      showValue={true}
      onChange={handleChange}
    />
  );
};

type ValueRangeSelectorProps = {
  min: number;
  max: number;
  currentMinValue?: number;
  currentMaxValue?: number;
  setCurrentMinValue: (minValue: number) => void;
  setCurrentMaxValue: (maxValue: number) => void;
};

const ValueRangeSelector: FunctionComponent<ValueRangeSelectorProps> = ({
  currentMinValue,
  currentMaxValue,
  setCurrentMinValue,
  setCurrentMaxValue,
  min,
  max,
}) => {
  const handleChange = (newMinValue: number, newMaxValue: number) => {
    setCurrentMinValue(newMinValue);
    setCurrentMaxValue(newMaxValue);
  };
  return (
    <DualRangeInput
      label="range:"
      min={min}
      max={max}
      value1={currentMinValue || 0}
      value2={currentMaxValue || 0}
      onChange={handleChange}
    />
  );
};

const RangeInput: FunctionComponent<{
  label: string;
  min: number;
  max: number;
  value: number;
  showValue: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}> = ({ label, min, max, value, showValue, onChange }) => {
  return (
    <span style={{ fontSize: 12 }}>
      {label}
      {showValue && ` ${value}`}:{" "}
      <input
        style={{ width: 70, position: "relative", top: 4 }}
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={onChange}
      />
    </span>
  );
};

const DualRangeInput: FunctionComponent<{
  label: string;
  min: number;
  max: number;
  value1: number;
  value2: number;
  onChange: (minValue: number, maxValue: number) => void;
}> = ({ label, min, max, value1, value2, onChange }) => {
  return (
    <div style={{ display: "flex" }}>
      <div style={{ position: "relative", top: 5 }}>{label}&nbsp;</div>
      <div style={{ position: "relative", top: 11 }}>
        <MultiRangeSlider
          min={min}
          max={max}
          value1={value1}
          value2={value2}
          setValue1={(x) => onChange(x, value2)}
          setValue2={(x) => onChange(value1, x)}
        />
      </div>
      &nbsp;
      <div style={{ position: "relative", top: 5 }}>
        {value1}-{value2}
      </div>
    </div>
  );
};

const maximum = (x: DatasetDataType): number => {
  let max = -Infinity;
  for (let i = 0; i < x.length; i++) {
    max = Math.max(max, x[i]);
  }
  return max;
};

const readDataFromDat = async (
  url: string,
  offset: number,
  length: number,
  dtype: string,
): Promise<DatasetDataType> => {
  let dt = "";
  if (dtype === "<h") dt = "int16";
  else if (dtype === "<i") dt = "int32";
  else if (dtype === "<f") dt = "float32";
  else if (dtype === "<d") dt = "float64";
  else dt = dtype;

  let numBytesPerElement = 0;
  if (dt === "int16") numBytesPerElement = 2;
  else if (dt === "int32") numBytesPerElement = 4;
  else if (dt === "float32") numBytesPerElement = 4;
  else if (dt === "float64") numBytesPerElement = 8;
  else throw Error(`Unexpected dtype: ${dtype}`);

  const startByte = offset * numBytesPerElement;
  const endByte = (offset + length) * numBytesPerElement;

  const response = await fetch(url, {
    headers: {
      Range: `bytes=${startByte}-${endByte - 1}`,
    },
  });

  const buf = await response.arrayBuffer();
  if (dt === "int16") {
    return new Int16Array(buf);
  } else if (dt === "int32") {
    return new Int32Array(buf);
  } else if (dt === "float32") {
    return new Float32Array(buf);
  } else if (dt === "float64") {
    return new Float64Array(buf);
  } else {
    throw Error(`Unexpected dtype: ${dtype}`);
  }
};

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

export default TwoPhotonSeriesItemView;
