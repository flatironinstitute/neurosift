/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {
  RemoteH5Dataset,
  RemoteH5FileX,
  RemoteH5Group,
} from "../../remote-h5-file/index";
import { FunctionComponent, useEffect, useState } from "react";
import PlaneTransformSelector, {
  PlaneTransform,
} from "../TwoPhotonSeries/PlaneTransformSelector";

type Props = {
  width: number;
  height: number;
  imageSegmentationGroup: RemoteH5Group;
  nwbFile: RemoteH5FileX;
  selectedSegmentationName: string;
};

// important to store localized masks, otherwise we run out of RAM quick
type UnitMask = {
  x0: number;
  y0: number;
  w0: number;
  h0: number;
  data: number[][];
};

const blockSize = 50;
class PlaneSegmentationClient {
  #imageMaskDataset: RemoteH5Dataset | undefined;
  #pixelMaskDataset: RemoteH5Dataset | undefined;
  #pixelMaskIndex: number[] | undefined;
  #pixelMaskImageSize: number[] | undefined; // in the case of pixel mask, we unfortunately do not have any direct way to get the image size
  #blocks: { [i: number]: UnitMask[] } = {};
  constructor(
    private nwbFile: RemoteH5FileX,
    private objectPath: string,
  ) {}
  async initialize() {
    this.#imageMaskDataset = await this.nwbFile.getDataset(
      `${this.objectPath}/image_mask`,
    );
    this.#pixelMaskDataset = await this.nwbFile.getDataset(
      `${this.objectPath}/pixel_mask`,
    );
    if (this.#pixelMaskDataset) {
      this.#pixelMaskIndex = (await this.nwbFile.getDatasetData(
        `${this.objectPath}/pixel_mask_index`,
        {},
      )) as any;
      this.#pixelMaskImageSize = await determineImageSizeFromNwbFileContext(
        this.nwbFile,
        this.objectPath,
      );
    }
    if (!this.#imageMaskDataset && !this.#pixelMaskDataset)
      throw Error(`No image mask or pixel mask dataset`);
  }
  get shape() {
    if (this.#imageMaskDataset) return this.#imageMaskDataset.shape;
    else if (this.#pixelMaskDataset) {
      if (!this.#pixelMaskImageSize) {
        console.error(`No pixel mask image size`);
        return [0, 0, 0]; // see comment above
      }
      return [
        this.#pixelMaskIndex!.length,
        this.#pixelMaskImageSize[0],
        this.#pixelMaskImageSize[1],
      ]; // see comment above
    } else throw Error(`No image mask or pixel mask dataset`);
  }
  get hasImageMask() {
    return !!this.#imageMaskDataset;
  }
  get hasPixelMask() {
    return !!this.#pixelMaskDataset;
  }
  async getImageMask(index: number) {
    if (!this.#imageMaskDataset)
      throw Error(`Cannot get image mask without image mask dataset`);
    const block = await this._loadBlock(Math.floor(index / blockSize));
    return block[index % blockSize];
  }
  async getPixelMask(index: number) {
    const i1 = index > 0 ? this.#pixelMaskIndex![index - 1] : 0;
    const i2 = this.#pixelMaskIndex![index];
    const data = await this.nwbFile.getDatasetData(
      `${this.objectPath}/pixel_mask`,
      { slice: [[i1, i2]] },
    );
    return data;
  }
  private async _loadBlock(chunkIndex: number) {
    if (!this.#imageMaskDataset)
      throw Error(`Cannot load block without image mask dataset`);
    if (this.#blocks[chunkIndex]) return this.#blocks[chunkIndex];
    const i1 = chunkIndex * blockSize;
    const i2 = Math.min(this.shape[0], i1 + blockSize);
    const data = await this.nwbFile.getDatasetData(
      `${this.objectPath}/image_mask`,
      {
        slice: [
          [i1, i2],
          [0, this.shape[1]],
          [0, this.shape[2]],
        ],
      },
    );
    if (!data) throw Error(`Unable to load image mask data`);
    const block: UnitMask[] = [];
    for (let i = 0; i < i2 - i1; i++) {
      const plane: number[][] = [];
      for (let j = 0; j < this.shape[1]; j++) {
        const row: number[] = [];
        for (let k = 0; k < this.shape[2]; k++) {
          row.push(
            data[i * this.shape[1] * this.shape[2] + j * this.shape[2] + k],
          );
        }
        plane.push(row);
      }
      // important to store localized masks, otherwise we run out of RAM quick
      const { x0, y0, w0, h0 } = getBoundingRect(plane);
      const data0: number[][] = [];
      for (let j = 0; j < w0; j++) {
        const row: number[] = [];
        for (let k = 0; k < h0; k++) {
          row.push(plane[x0 + j][y0 + k]);
        }
        data0.push(row);
      }
      block.push({
        x0,
        y0,
        w0,
        h0,
        data: data0,
      });
    }

    this.#blocks[chunkIndex] = block;
    return block;
  }
}

const determineImageSizeFromNwbFileContext = async (
  nwbFile: RemoteH5FileX,
  objectPath: string,
) => {
  /*
    In the case of pixel mask, we unfortunately do not have any direct way to get the image size.
    We need to determine it from the context. In other words, the sibling objects.
    */
  let parentPath = objectPath.split("/").slice(0, -1).join("/");
  let parentGroup = await nwbFile.getGroup(parentPath);
  if (!parentGroup)
    throw Error(`Unable to get parent group for determining image size`);
  if (parentGroup.attrs["neurodata_type"] === "ImageSegmentation") {
    // need to go up one more level
    parentPath = parentPath.split("/").slice(0, -1).join("/");
    parentGroup = await nwbFile.getGroup(parentPath);
    if (!parentGroup)
      throw Error(`Unable to get parent group for determining image size`);
  }
  for (const sg of parentGroup.subgroups) {
    if (sg.attrs["neurodata_type"] === "Images") {
      const imagesGroup = await nwbFile.getGroup(`${parentPath}/${sg.name}`);
      if (!imagesGroup) {
        continue;
      }
      for (const ds of imagesGroup.datasets) {
        if (
          ds.attrs["neurodata_type"] === "Image" ||
          ds.attrs["neurodata_type"] === "GrayscaleImage"
        ) {
          if (ds.shape.length === 2) {
            return ds.shape;
          }
        }
      }
    }
  }
  return undefined;
};

const PlaneSegmentationView: FunctionComponent<Props> = ({
  width,
  height,
  imageSegmentationGroup,
  nwbFile,
  selectedSegmentationName,
}) => {
  const [client, setClient] = useState<PlaneSegmentationClient | undefined>(
    undefined,
  );
  useEffect(() => {
    let canceled = false;
    const load = async () => {
      const c = new PlaneSegmentationClient(
        nwbFile,
        `${imageSegmentationGroup.path}/${selectedSegmentationName}`,
      );
      await c.initialize();
      if (canceled) return;
      setClient(c);
    };
    load();
    return () => {
      canceled = true;
    };
  }, [nwbFile, selectedSegmentationName, imageSegmentationGroup.path]);
  if (!client) return <div>Loading client...</div>;
  return <Test1 width={width} height={height} client={client} />;
};

const v1 = 255;
const v2 = 160;
const _ = 128;
const distinctColors = [
  [v1, _, _],
  [_, v1, _],
  [_, _, v1],
  [v1, v1, _],
  [v1, _, v1],
  [_, v1, v1],
  [v1, v2, _],
  [v1, _, v2],
  [_, v1, v2],
  [v2, v1, _],
  [v2, _, v1],
  [_, v2, v1],
];

const Test1: FunctionComponent<{
  client: PlaneSegmentationClient;
  width: number;
  height: number;
}> = ({ client, width, height }) => {
  const [canvasElement, setCanvasElement] = useState<
    HTMLCanvasElement | undefined
  >(undefined);

  const statusBarHeight = 20;

  const [planeTransform, setPlaneTransform] = useState<PlaneTransform>({
    xyswap: false,
    xflip: false,
    yflip: false,
  });

  const N0 = client.shape[0];
  const N1a = client.shape[1];
  const N2a = client.shape[2];
  const N1 = planeTransform.xyswap ? N2a : N1a;
  const N2 = planeTransform.xyswap ? N1a : N2a;
  const scale = Math.min(width / N1, (height - statusBarHeight) / N2);
  const offsetX = (width - N1 * scale) / 2;
  const offsetY = (height - statusBarHeight - N2 * scale) / 2;

  const [loadingMessage, setLoadingMessage] = useState("");

  useEffect(() => {
    setLoadingMessage("Loading...");
    let canceled = false;
    if (!canvasElement) return;
    const ctx = canvasElement.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvasElement.width, canvasElement.height);
    const load = async () => {
      let timer = Date.now();
      for (let j = 0; j < N0; j++) {
        const elapsed = (Date.now() - timer) / 1000;
        if (elapsed > 1) {
          setLoadingMessage(`Loaded ${j} / ${N0}...`);
          timer = Date.now();
        }
        const color = distinctColors[j % distinctColors.length];
        if (client.hasImageMask) {
          // NOTE: xy flip is not handled properly in this branch. My brain hurts. Any assistance appreciated.
          const aa = await client.getImageMask(j);
          if (canceled) return;
          console.log(aa);
          const { x0: x0a, y0: y0a, w0: w0a, h0: h0a, data } = aa;
          const w0 = w0a;
          const h0 = h0a;
          const x0 = planeTransform.xflip ? N1 - x0a - w0 : x0a;
          const y0 = planeTransform.yflip ? N2 - y0a - h0 : y0a;
          const maxval = computeMaxVal(data);
          const imageData = ctx.createImageData(w0, h0);
          for (let i = 0; i < w0; i++) {
            const i2 = planeTransform.xflip ? w0 - 1 - i : i;
            for (let j = 0; j < h0; j++) {
              const j2 = planeTransform.yflip ? h0 - 1 - j : j;
              const v = data[i2][h0 - 1 - j2] / (maxval || 1);
              const index = (j * w0 + i) * 4;
              imageData.data[index + 0] = color[0] * v;
              imageData.data[index + 1] = color[1] * v;
              imageData.data[index + 2] = color[2] * v;
              imageData.data[index + 3] = v ? v * 255 : 0;
            }
          }
          const offscreenCanvas = document.createElement("canvas");
          offscreenCanvas.width = w0;
          offscreenCanvas.height = h0;
          const c = offscreenCanvas.getContext("2d");
          if (!c) return;
          c.putImageData(imageData, 0, 0);
          ctx.drawImage(
            offscreenCanvas,
            x0 * scale,
            y0 * scale,
            w0 * scale,
            h0 * scale,
          );
        } else if (client.hasPixelMask) {
          const aa = await client.getPixelMask(j);
          if (!aa) throw Error(`Unable to load pixel mask data`);
          const values: { x: number; y: number; v: number }[] = [];
          for (let i = 0; i < aa.length; i++) {
            const b = aa[i] as any;
            values.push({ x: b[0], y: b[1], v: b[2] });
          }
          const maxval = values.reduce((maxval, v) => Math.max(maxval, v.v), 0);
          const imageData = ctx.createImageData(N1, N2);
          for (let i = 0; i < values.length; i++) {
            const { x: xa, y: ya, v } = values[i];
            const x = planeTransform.xyswap ? ya : xa;
            const y = planeTransform.xyswap ? xa : ya;
            const x2 = planeTransform.xflip ? N1 - 1 - x : x;
            const y2 = planeTransform.yflip ? N2 - 1 - y : y;
            const index = ((N2 - 1 - y2) * N1 + x2) * 4;
            imageData.data[index + 0] = (color[0] * v) / maxval;
            imageData.data[index + 1] = (color[1] * v) / maxval;
            imageData.data[index + 2] = (color[2] * v) / maxval;
            imageData.data[index + 3] = v ? v * 255 : 0;
          }
          const offscreenCanvas = document.createElement("canvas");
          offscreenCanvas.width = N1;
          offscreenCanvas.height = N2;
          const c = offscreenCanvas.getContext("2d");
          if (!c) return;
          c.putImageData(imageData, 0, 0);
          ctx.drawImage(offscreenCanvas, 0, 0, N1 * scale, N2 * scale);
        }
      }
      setLoadingMessage(`Loaded ${N0} units`);
    };
    load();
    return () => {
      canceled = true;
    };
  }, [canvasElement, client, N0, N1, N2, scale, planeTransform]);

  return (
    <div style={{ position: "absolute", width, height, fontSize: 12 }}>
      <div
        style={{
          position: "absolute",
          width: N1 * scale,
          height: N2 * scale,
          left: offsetX,
          top: offsetY,
        }}
      >
        <canvas
          ref={(elmt) => elmt && setCanvasElement(elmt)}
          width={N1 * scale}
          height={N2 * scale}
        />
      </div>
      <div
        style={{
          position: "absolute",
          width,
          height: statusBarHeight,
          top: height - statusBarHeight,
        }}
      >
        <PlaneTransformSelector
          planeTransform={planeTransform}
          setPlaneTransform={setPlaneTransform}
        />
      </div>
      <div
        style={{
          position: "absolute",
          width,
          height: statusBarHeight,
          top: height - statusBarHeight + 5,
          left: 200,
        }}
      >
        {loadingMessage}
      </div>
    </div>
  );
};

const getBoundingRect = (data: number[][]) => {
  let x0 = undefined;
  let y0 = undefined;
  let x1 = undefined;
  let y1 = undefined;
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    for (let j = 0; j < row.length; j++) {
      const v = row[j];
      if (v) {
        if (x0 === undefined) x0 = i;
        if (y0 === undefined) y0 = j;
        if (x1 === undefined) x1 = i;
        if (y1 === undefined) y1 = j;
        x0 = Math.min(x0, i);
        y0 = Math.min(y0, j);
        x1 = Math.max(x1, i);
        y1 = Math.max(y1, j);
      }
    }
  }
  if (
    x0 === undefined ||
    y0 === undefined ||
    x1 === undefined ||
    y1 === undefined
  )
    return { x0: 0, y0: 0, w0: 0, h0: 0 };
  return { x0, y0, w0: x1 - x0 + 1, h0: y1 - y0 + 1 };
};

const computeMaxVal = (data: number[][]) => {
  let maxval = 0;
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    for (let j = 0; j < row.length; j++) {
      const v = row[j];
      maxval = Math.max(maxval, v);
    }
  }
  return maxval;
};

export default PlaneSegmentationView;
