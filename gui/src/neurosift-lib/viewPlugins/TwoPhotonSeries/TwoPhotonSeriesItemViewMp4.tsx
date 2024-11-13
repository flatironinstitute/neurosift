import { FunctionComponent, useEffect, useMemo, useState } from "react";
import { useNwbFile } from "../../misc/NwbFileContext";
import { RemoteH5FileLindi } from "../../remote-h5-file/index";

type TwoPhotonSeriesItemViewMp4Props = {
  width: number;
  height: number;
  path: string;
};

const TwoPhotonSeriesItemViewMp4: FunctionComponent<
  TwoPhotonSeriesItemViewMp4Props
> = ({ width, height, path }) => {
  const nwbFile = useNwbFile();
  const [mp4Buf, setMp4Buf] = useState<ArrayBuffer | undefined>(undefined);
  const [size, setSize] = useState<[number, number] | undefined>(undefined);
  useEffect(() => {
    if (!nwbFile) return;
    if (!(nwbFile instanceof RemoteH5FileLindi)) {
      throw Error(
        "TwoPhotonSeriesItemViewMp4 only works with RemoteH5FileLindi",
      );
    }
    const client = nwbFile._lindiFileSystemClient;
    (async () => {
      const pathWithoutBeginningSlash = path.startsWith("/")
        ? path.slice(1)
        : path;
      const zarray = await client.readJson(
        pathWithoutBeginningSlash + "/data/.zarray",
      );
      const compressor = zarray?.compressor;
      if (!compressor) throw Error("No compressor");
      if (compressor.id !== "mp4avc") throw Error("Compressor is not mp4avc");
      const shape = zarray.shape;
      const chunks = zarray.chunks;
      if (!shape) throw Error("No shape");
      if (!chunks) throw Error("No chunks");
      for (let i = 1; i < shape.length; i++) {
        if (shape[i] !== chunks[i])
          throw Error("Chunks must match shape for dimensions > 0");
      }
      const chunkKey =
        shape.length === 4
          ? "0.0.0.0"
          : shape.length === 3
            ? "0.0.0"
            : undefined;
      if (!chunkKey) throw Error("Unsupported shape length");
      const buf = await client.readBinary(
        pathWithoutBeginningSlash + "/data/" + chunkKey,
        {},
      );
      setMp4Buf(buf);
      setSize([shape[2], shape[1]]);
    })();
  }, [nwbFile, path]);
  const dataUrl = useMemo(() => {
    if (!mp4Buf) return undefined;
    const blob = new Blob([mp4Buf], { type: "video/mp4" });
    return URL.createObjectURL(blob);
  }, [mp4Buf]);
  const [brightness, setBrightness] = useState(150);
  const [contrast, setContrast] = useState(100);
  if (!mp4Buf) return <div>Loading mp4...</div>;
  return (
    <div>
      <div
        style={{ filter: `brightness(${brightness}%) contrast(${contrast}%)` }}
      >
        {dataUrl && size && (
          <video width={size[0]} height={size[1]} controls>
            <source src={dataUrl} type="video/mp4" />
          </video>
        )}
      </div>
      <BrightnessContrastSelector
        brightness={brightness}
        setBrightness={setBrightness}
        contrast={contrast}
        setContrast={setContrast}
      />
    </div>
  );
};

const BrightnessContrastSelector: FunctionComponent<{
  brightness: number;
  setBrightness: (b: number) => void;
  contrast: number;
  setContrast: (c: number) => void;
}> = ({ brightness, setBrightness, contrast, setContrast }) => {
  // use a couple sliders
  return (
    <div>
      <label htmlFor="brightness-slider">Brightness:</label>
      <input
        id="brightness-slider"
        type="range"
        min="0"
        max="300"
        value={brightness}
        onChange={(e) => setBrightness(parseInt(e.target.value))}
      />

      <label htmlFor="contrast-slider">Contrast:</label>
      <input
        id="contrast-slider"
        type="range"
        min="0"
        max="300"
        value={contrast}
        onChange={(e) => setContrast(parseInt(e.target.value))}
      />
    </div>
  );
};

export default TwoPhotonSeriesItemViewMp4;
