/* eslint-disable no-constant-condition */
import { RemoteH5FileLindi, RemoteH5FileX } from "../../remote-h5-file/index";
import {
  FunctionComponent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNwbFile } from "../../misc/NwbFileContext";
import { useDataset } from "../../misc/hooks";

type Props = {
  width: number;
  height: number;
  path: string;
  condensed?: boolean;
};

const TestVideoItemView: FunctionComponent<Props> = ({
  width,
  height,
  path,
}) => {
  const nwbFile = useNwbFile();
  const dataset = useDataset(nwbFile, `${path}/data`);

  const { videoWidth, videoHeight } = useMemo(() => {
    if (!dataset) return { videoWidth: 0, videoHeight: 0, numFrames: 0 };
    const shape = dataset.shape;
    if (shape.length < 3)
      return { videoWidth: 0, videoHeight: 0, numFrames: 0 };
    return { videoWidth: shape[2], videoHeight: shape[1], numFrames: shape[0] };
  }, [dataset]);

  const [videoUrl, setVideoUrl] = useState<string | undefined>(undefined);
  useEffect(() => {
    (async () => {
      const u = await getVideoUrlForDataset(nwbFile, `${path}/data`);
      setVideoUrl(u);
    })();
  }, [nwbFile, path]);

  const [videoRef, setVideoRef] = useState<HTMLVideoElement | null>(null);
  const onRef = useCallback((ref: HTMLVideoElement | null) => {
    setVideoRef(ref);
  }, []);

  useEffect(() => {
    if (!videoRef) return;
    let canceled = false;
    const timer = Date.now();
    (async () => {
      while (true) {
        const elapsed = (Date.now() - timer) / 1000;
        const t0 = elapsed;
        if (t0 !== videoRef.currentTime) {
          videoRef.currentTime = t0;
          await waitForSeeked(videoRef);
        }
        // pause for 10 ms
        await new Promise((resolve) => setTimeout(resolve, 10));
        if (canceled) return;
      }
    })();
    return () => {
      canceled = true;
    };
  }, [videoRef]);

  if (!dataset) return <div>Loading...</div>;

  return (
    <div>
      <video ref={(ref) => onRef(ref)} width={videoWidth} height={videoHeight}>
        <source src={videoUrl} type="video/mp4" />
      </video>
    </div>
  );
};

const waitForSeeked = (video: HTMLVideoElement) => {
  return new Promise<void>((resolve) => {
    video.addEventListener(
      "seeked",
      () => {
        resolve();
      },
      { once: true },
    );
  });
};

const getVideoUrlForDataset = async (
  nwbFile: RemoteH5FileX,
  path: string,
): Promise<string> => {
  if (!(nwbFile instanceof RemoteH5FileLindi)) {
    console.warn("getVideoUrlForDataset: not a RemoteH5FileLindi");
    return "";
  }
  const pathWithoutSlashPrefix = path.startsWith("/") ? path.slice(1) : path;
  const refs = nwbFile._lindiFileSystemClient._refs;
  const ref = refs[pathWithoutSlashPrefix + "/0.0.0.0"];
  return nwbFile._lindiFileSystemClient._applyTemplates(ref[0]);
};

export default TestVideoItemView;
