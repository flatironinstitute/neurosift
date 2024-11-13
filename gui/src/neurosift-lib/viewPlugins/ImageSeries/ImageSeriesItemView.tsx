import { FunctionComponent, useEffect, useMemo, useState } from "react";
import { useNwbFile } from "../../misc/NwbFileContext";
import { RemoteH5Dataset, RemoteH5FileX } from "../../remote-h5-file/index";
import { BrightnessSelector, ContrastSelector } from "../Images/ImagesItemView";
import TwoPhotonSeriesItemView from "../TwoPhotonSeries/TwoPhotonSeriesItemView";

type Props = {
  width: number;
  height: number;
  path: string;
  condensed?: boolean;
};

// Example: https://neurosift.app/?p=/nwb&url=https://api.dandiarchive.org/api/assets/fdaa72ee-403c-4dbf-be35-64e7f31c4c1e/download/&dandisetId=000363&dandisetVersion=0.231012.2129&tab=neurodata-item:/acquisition/SC038_111919_side_face_1-0000|ImageSeries

const ImageSeriesItemView: FunctionComponent<Props> = ({
  width,
  height,
  path,
}) => {
  return (
    <TwoPhotonSeriesItemView
      width={width}
      height={height}
      path={path}
      rgb={true}
    />
  );
};

export const ImageSeriesItemViewOtherAttempt: FunctionComponent<Props> = ({
  width,
  height,
  path,
}) => {
  const nwbFile = useNwbFile();
  if (!nwbFile) {
    throw Error("No NWB file found in context");
  }
  const [errorString, setErrorString] = useState<string | null>(null);
  const [imageSeriesClient, setImageSeriesClient] =
    useState<ImageSeriesClient | null>(null);
  useEffect(() => {
    let canceled = false;
    setImageSeriesClient(null);
    setErrorString(null);
    (async () => {
      const dataDataset = await nwbFile.getDataset(path + "/data");
      // const startingTimeDataset = await nwbFile.getDataset(
      //   path + "/starting_time",
      // );
      // const startingTimeData = await nwbFile.getDatasetData(
      //   path + "/starting_time",
      //   {},
      // );
      if (canceled) {
        return;
      }
      if (!dataDataset) {
        setErrorString("No data dataset found");
        return;
      }
      // if (!startingTimeDataset) {
      //   setErrorString("No starting time dataset found");
      //   return;
      // }
      // if (startingTimeData === undefined) {
      //   setErrorString("No starting time data found");
      //   return;
      // }
      if (dataDataset.shape.length < 3) {
        setErrorString("Data dataset must have at least 3 dimensions");
        return;
      }
      if (dataDataset.shape.length > 4) {
        setErrorString("Data dataset must have at most 4 dimensions");
        return;
      }
      // const startingTime = startingTimeData as any as number;
      const client = new ImageSeriesClient({
        nwbFile,
        dataDataset,
      });
      setImageSeriesClient(client);
    })();
    return () => {
      canceled = true;
    };
  }, [nwbFile, path]);
  if (errorString) {
    return <div>{errorString}</div>;
  }
  if (!imageSeriesClient) {
    return <div>Loading...</div>;
  }
  return (
    <ImageSeriesWidget
      client={imageSeriesClient}
      width={width}
      height={height}
    />
  );
};

type ImageSeriesWidgetProps = {
  client: ImageSeriesClient;
  width: number;
  height: number;
};

const ImageSeriesWidget: FunctionComponent<ImageSeriesWidgetProps> = ({
  client,
  width,
  height,
}) => {
  const H = client.imageWidth;
  const W = client.imageHeight;

  const [canvasElement, setCanvasElement] = useState<HTMLCanvasElement | null>(
    null,
  );

  const [brightness, setBrightness] = useState<number>(50); // brightness between -0 and 100
  const [contrast, setContrast] = useState<number>(50); // contrast between 0 and 100

  const [currentFrameIndex, setCurrentFrameIndex] = useState<number>(0);

  const [data, setData] = useState<
    number[] | [number, number, number][] | null
  >(null);
  useEffect(() => {
    let canceled = false;
    (async () => {
      const data = await client.getDataForFrame(currentFrameIndex);
      if (canceled) {
        return;
      }
      setData(data);
    })();
    return () => {
      canceled = true;
    };
  }, [client, currentFrameIndex]);

  const maxVal = useMemo(() => {
    if (!data) return 0;
    if (client.isGrayscale) {
      const dd = data as any as number[];
      let ret = 0;
      for (let i = 0; i < W * H; i++) {
        const val = dd[i];
        if (val > ret) ret = val;
      }
      return ret;
    } else {
      const dd = data as any as [number, number, number][];
      let ret = 0;
      for (let i = 0; i < W * H; i++) {
        const r = dd[i][0];
        const g = dd[i][1];
        const b = dd[i][2];
        const val = Math.max(r, g, b);
        if (val > ret) ret = val;
      }
      return ret;
    }
  }, [data, W, H, client.isGrayscale]);

  const { windowMin, windowMax } = useMemo(() => {
    // brightness 50 and contrast 50 corresponds to windowMin 0 and windowMax maxVal
    const contrastScale = Math.exp(((contrast - 50) / 50) * Math.log(10));
    let windowMin = maxVal / 2 - maxVal / 2 / contrastScale;
    let windowMax = maxVal / 2 + maxVal / 2 / contrastScale;
    windowMin = windowMin - ((brightness - 50) / 50) * maxVal;
    windowMax = windowMax - ((brightness - 50) / 50) * maxVal;
    return { windowMin, windowMax };
  }, [maxVal, brightness, contrast]);

  useEffect(() => {
    if (!data) return;
    if (!canvasElement) return;
    const ctx = canvasElement.getContext("2d");
    if (!ctx) return;
    const imageData = ctx.createImageData(W, H);
    const buf = imageData.data;
    if (client.isGrayscale) {
      const dd = data as any as number[];
      for (let j = 0; j < H; j++) {
        for (let i = 0; i < W; i++) {
          const val = dd[i + j * W];
          const ind = (i + j * W) * 4;
          const v = Math.min(
            Math.max(0, ((val - windowMin) / (windowMax - windowMin)) * 255),
            255,
          );
          buf[ind + 0] = v;
          buf[ind + 1] = v;
          buf[ind + 2] = v;
          buf[ind + 3] = 255;
        }
      }
    } else {
      const dd = data as any as [number, number, number][];
      for (let j = 0; j < H; j++) {
        for (let i = 0; i < W; i++) {
          const r = dd[i + j * W][0];
          const g = dd[i + j * W][1];
          const b = dd[i + j * W][2];
          // const val = Math.max(r, g, b);
          const ind = (i + j * W) * 4;
          const v_r = Math.min(
            Math.max(0, ((r - windowMin) / (windowMax - windowMin)) * 255),
            255,
          );
          const v_g = Math.min(
            Math.max(0, ((g - windowMin) / (windowMax - windowMin)) * 255),
            255,
          );
          const v_b = Math.min(
            Math.max(0, ((b - windowMin) / (windowMax - windowMin)) * 255),
            255,
          );
          buf[ind + 0] = v_r;
          buf[ind + 1] = v_g;
          buf[ind + 2] = v_b;
          buf[ind + 3] = 255;
        }
      }
    }
    ctx.putImageData(imageData, 0, 0);
  }, [
    canvasElement,
    W,
    H,
    data,
    maxVal,
    windowMin,
    windowMax,
    client.isGrayscale,
  ]);

  if (!data) {
    return <div>Loading data...</div>;
  }

  return (
    <div>
      <canvas ref={(elmt) => setCanvasElement(elmt)} width={W} height={H} />
      <div>
        <BrightnessSelector value={brightness} onChange={setBrightness} />
        &nbsp;
        <ContrastSelector value={contrast} onChange={setContrast} />
      </div>
      <div>
        <FrameSelector
          currentFrameIndex={currentFrameIndex}
          numFrames={client.numFrames}
          onChange={setCurrentFrameIndex}
        />
      </div>
    </div>
  );
};

class ImageSeriesClient {
  constructor(
    private o: {
      nwbFile: RemoteH5FileX;
      dataDataset: RemoteH5Dataset;
    },
  ) {}
  get numFrames() {
    return this.o.dataDataset.shape[0];
  }
  get imageWidth() {
    return this.o.dataDataset.shape[1];
  }
  get imageHeight() {
    return this.o.dataDataset.shape[2];
  }
  get isGrayscale() {
    return this.o.dataDataset.shape.length === 3;
  }
  async getDataForFrame(
    frame: number,
  ): Promise<number[] | [number, number, number][]> {
    const shape = this.o.dataDataset.shape;
    const data = await this.o.nwbFile.getDatasetData(this.o.dataDataset.path, {
      slice: [[frame, frame + 1]],
    });
    if (!data) {
      throw Error("Cannot get dataset data.");
    }
    if (shape.length === 3) {
      return data as any as number[];
    } else {
      const dd: [number, number, number][] = [];
      for (let i = 0; i < data?.length; i += shape[3]) {
        dd.push([data[i], data[i + 1], data[i + 2]]);
      }
      return dd;
    }
  }
}

export const fetchJson = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw Error(
      `Unexpected response from ${url}: ${response.status} ${response.statusText}`,
    );
  }
  return await response.json();
};

type FrameSelectorProps = {
  currentFrameIndex: number;
  numFrames: number;
  onChange: (frame: number) => void;
};

const FrameSelector: FunctionComponent<FrameSelectorProps> = ({
  currentFrameIndex,
  numFrames,
  onChange,
}) => {
  return (
    <div>
      <input
        type="range"
        min={0}
        title="Frame"
        max={numFrames - 1}
        value={currentFrameIndex}
        onChange={(e) => onChange(parseInt(e.target.value))}
      />
      <PrevButton
        currentFrameIndex={currentFrameIndex}
        numFrames={numFrames}
        onChange={onChange}
      />
      <NextButton
        currentFrameIndex={currentFrameIndex}
        numFrames={numFrames}
        onChange={onChange}
      />
    </div>
  );
};

const PrevButton: FunctionComponent<FrameSelectorProps> = ({
  currentFrameIndex,
  numFrames,
  onChange,
}) => {
  return (
    <button
      disabled={currentFrameIndex === 0}
      onClick={() => onChange(currentFrameIndex - 1)}
    >
      Prev
    </button>
  );
};

const NextButton: FunctionComponent<FrameSelectorProps> = ({
  currentFrameIndex,
  numFrames,
  onChange,
}) => {
  return (
    <button
      disabled={currentFrameIndex === numFrames - 1}
      onClick={() => onChange(currentFrameIndex + 1)}
    >
      Next
    </button>
  );
};

// const constructPath = (assetPath: string, relativePath: string) => {
//     const assetPathParts = assetPath.split('/')
//     const relativePathParts = relativePath.split('/')
//     const newPathParts = assetPathParts.slice(0, assetPathParts.length - 1).concat(relativePathParts)
//     return newPathParts.join('/')
// }

export default ImageSeriesItemView;
