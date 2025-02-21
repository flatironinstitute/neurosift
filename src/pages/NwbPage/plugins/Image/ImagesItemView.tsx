import { FunctionComponent, useEffect, useMemo, useState } from "react";
import IfHasBeenVisible from "../PSTH/PSTHItemView/IfHasBeenVisible";
import {
  Hdf5Dataset,
  useHdf5Dataset,
  useHdf5DatasetData,
  useHdf5Group,
} from "@hdf5Interface";
import { DatasetDataType } from "@remote-h5-file";

type Props = {
  width: number;
  height: number;
  nwbUrl: string;
  path: string;
  condensed?: boolean;
};

const ImagesItemView: FunctionComponent<Props> = ({
  width,
  height,
  nwbUrl,
  path,
}) => {
  const group = useHdf5Group(nwbUrl, path);
  const { imageWidth, imageHeight } = useMemo(() => {
    if (!group) return { imageWidth: 0, imageHeight: 0 };
    let imageWidth = 0;
    let imageHeight = 0;
    group.datasets.forEach((ds) => {
      if (ds.shape.length !== 2) return;
      if (ds.shape[0] > imageHeight) imageHeight = ds.shape[0];
      if (ds.shape[1] > imageWidth) imageWidth = ds.shape[1];
    });
    return { imageWidth, imageHeight };
  }, [group]);
  if (!group) return <div>Loading group...</div>;
  return (
    <div style={{ position: "relative", width, height, overflowY: "auto" }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "20px",
          padding: "10px",
        }}
      >
        {group.datasets.map((ds) => (
          <div key={ds.path} style={{ minWidth: imageWidth }}>
            <IfHasBeenVisible
              key={ds.path}
              width={imageWidth}
              height={imageHeight + 60}
            >
              <h3>{ds.name}</h3>
              <ImageItem
                nwbUrl={nwbUrl}
                path={ds.path}
                neurodataType={ds.attrs["neurodata_type"]}
              />
            </IfHasBeenVisible>
          </div>
        ))}
      </div>
    </div>
  );
};

type ImageItemProps = {
  nwbUrl: string;
  path: string;
  neurodataType: string;
};

export const ImageItem: FunctionComponent<ImageItemProps> = ({
  nwbUrl,
  path,
  neurodataType,
}) => {
  const dataset = useHdf5Dataset(nwbUrl, path);
  const { data, errorMessage } = useHdf5DatasetData(nwbUrl, path);
  if (errorMessage) {
    return <div>Error loading data: {errorMessage}</div>;
  }
  if (!dataset) return <div>Loading dataset...</div>;
  if (!data) return <div>Loading data (ImageItem)...</div>;

  if (neurodataType === "GrayscaleImage") {
    return <GrayscaleImageItem dataset={dataset} data={data} />;
  } else if (neurodataType === "Image") {
    return <RegularImageItem dataset={dataset} data={data} />;
  } else if (neurodataType === "RGBImage") {
    return <RGBImageItem dataset={dataset} data={data} />;
  } else if (neurodataType === "RGBAImage") {
    return <RGBAImageItem dataset={dataset} data={data} />;
  } else {
    return <div>Unexpected neurodata_type: {neurodataType}</div>;
  }
};

type GrayscaleImageItemProps = {
  dataset: Hdf5Dataset;
  data: DatasetDataType;
};

const GrayscaleImageItem: FunctionComponent<GrayscaleImageItemProps> = ({
  dataset,
  data,
}) => {
  const H = dataset.shape[0];
  const W = dataset.shape[1];

  const [canvasElement, setCanvasElement] = useState<HTMLCanvasElement | null>(
    null,
  );

  const [brightness, setBrightness] = useState<number>(50); // brightness between -0 and 100
  const [contrast, setContrast] = useState<number>(50); // contrast between 0 and 100

  const maxVal = useMemo(() => {
    let ret = 0;
    for (let i = 0; i < W * H; i++) {
      const val = data[i];
      if (val > ret) ret = val;
    }
    return ret;
  }, [data, W, H]);

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
    if (!canvasElement) return;
    const ctx = canvasElement.getContext("2d");
    if (!ctx) return;
    const imageData = ctx.createImageData(W, H);
    const buf = imageData.data;
    for (let j = 0; j < H; j++) {
      for (let i = 0; i < W; i++) {
        const val = data[i + j * W];
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
    ctx.putImageData(imageData, 0, 0);
  }, [canvasElement, W, H, data, maxVal, windowMin, windowMax]);

  return (
    <div>
      <canvas ref={(elmt) => setCanvasElement(elmt)} width={W} height={H} />
      <div>
        <BrightnessSelector value={brightness} onChange={setBrightness} />
        &nbsp;
        <ContrastSelector value={contrast} onChange={setContrast} />
      </div>
    </div>
  );
};

type RegularImageItemProps = {
  dataset: Hdf5Dataset;
  data: DatasetDataType;
};

const RegularImageItem: FunctionComponent<RegularImageItemProps> = ({
  dataset,
  data,
}) => {
  if (dataset.shape.length === 2) {
    // I guess this is just a grayscale image
    return <GrayscaleImageItem dataset={dataset} data={data} />;
  } else if (dataset.shape.length === 3 && dataset.shape[2] === 3) {
    // I guess this is an RGB image
    return <RGBImageItem dataset={dataset} data={data} />;
  } else {
    return (
      <div>Image not supported with shape: {dataset.shape.join(", ")}</div>
    );
  }
};

type RGBImageItemProps = {
  dataset: Hdf5Dataset;
  data: DatasetDataType;
};

const RGBImageItem: FunctionComponent<RGBImageItemProps> = ({
  dataset,
  data,
}) => {
  const H = dataset.shape[0];
  const W = dataset.shape[1];

  const [canvasElement, setCanvasElement] = useState<HTMLCanvasElement | null>(
    null,
  );

  useEffect(() => {
    if (dataset.shape.length !== 3) {
      console.error("Unexpected dataset shape for RGB image: ", dataset.shape);
      return;
    }
    if (dataset.shape[2] !== 3) {
      console.error(
        "Unexpected number of channels for RGB image: ",
        dataset.shape[2],
      );
      return;
    }
    if (!canvasElement) return;
    const ctx = canvasElement.getContext("2d");
    if (!ctx) return;
    const imageData = ctx.createImageData(W, H);
    const buf = imageData.data;
    for (let j = 0; j < H; j++) {
      for (let i = 0; i < W; i++) {
        const v1 = data[(i + j * W) * 3 + 0];
        const v2 = data[(i + j * W) * 3 + 1];
        const v3 = data[(i + j * W) * 3 + 2];
        const ind = (i + j * W) * 4;
        buf[ind + 0] = v1;
        buf[ind + 1] = v2;
        buf[ind + 2] = v3;
        buf[ind + 3] = 255;
      }
    }
    ctx.putImageData(imageData, 0, 0);
  }, [canvasElement, W, H, dataset, data]);

  return <canvas ref={(elmt) => setCanvasElement(elmt)} width={W} height={H} />;
};

type RGBAImageItemProps = {
  dataset: Hdf5Dataset;
  data: DatasetDataType;
};

const RGBAImageItem: FunctionComponent<RGBAImageItemProps> = ({
  dataset,
  data,
}) => {
  const H = dataset.shape[0];
  const W = dataset.shape[1];

  const [canvasElement, setCanvasElement] = useState<HTMLCanvasElement | null>(
    null,
  );

  useEffect(() => {
    if (dataset.shape.length !== 3) {
      console.error("Unexpected dataset shape for RGBA image: ", dataset.shape);
      return;
    }
    if (dataset.shape[2] !== 4) {
      console.error(
        "Unexpected number of channels for RGBA image: ",
        dataset.shape[2],
      );
      return;
    }
    if (!canvasElement) return;
    const ctx = canvasElement.getContext("2d");
    if (!ctx) return;
    const imageData = ctx.createImageData(W, H);
    const buf = imageData.data;
    for (let j = 0; j < H; j++) {
      for (let i = 0; i < W; i++) {
        const v1 = data[(i + j * W) * 4 + 0];
        const v2 = data[(i + j * W) * 4 + 1];
        const v3 = data[(i + j * W) * 4 + 2];
        const v4 = data[(i + j * W) * 4 + 3];
        const ind = (i + j * W) * 4;
        buf[ind + 0] = v1;
        buf[ind + 1] = v2;
        buf[ind + 2] = v3;
        buf[ind + 3] = v4;
      }
    }
    ctx.putImageData(imageData, 0, 0);
  }, [canvasElement, W, H, dataset, data]);

  return <canvas ref={(elmt) => setCanvasElement(elmt)} width={W} height={H} />;
};

type BrightnessSelectorProps = {
  value: number;
  onChange: (value: number) => void;
};

export const BrightnessSelector: FunctionComponent<BrightnessSelectorProps> = ({
  value,
  onChange,
}) => {
  // slider
  return (
    <input
      type="range"
      title="Brightness"
      min={0}
      max={100}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  );
};

type ContrastSelectorProps = {
  value: number;
  onChange: (value: number) => void;
};

export const ContrastSelector: FunctionComponent<ContrastSelectorProps> = ({
  value,
  onChange,
}) => {
  // slider
  return (
    <input
      type="range"
      title="Contrast"
      min={0}
      max={100}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  );
};

export default ImagesItemView;
