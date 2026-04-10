import { getHdf5Group } from "@hdf5Interface";
import { FunctionComponent, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import VideoViewer from "../../../VideoPage/VideoViewer";
import { resolveExternalVideoUrl } from "../../externalVideoUtils";

type Props = {
  width?: number;
  height?: number;
  nwbUrl: string;
  path: string;
};

const ExternalFileVideoView: FunctionComponent<Props> = ({
  width = 800,
  height = 600,
  nwbUrl,
  path,
}) => {
  const [searchParams] = useSearchParams();
  const [videoUrl, setVideoUrl] = useState<string>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let canceled = false;
    const load = async () => {
      setLoading(true);
      setError(undefined);
      setVideoUrl(undefined);
      try {
        const group = await getHdf5Group(nwbUrl, path);
        if (!group) {
          throw new Error("Unable to load the ImageSeries group.");
        }
        if (!group.datasets.some((ds) => ds.name === "external_file")) {
          throw new Error("This ImageSeries does not define an external_file.");
        }
        const resolvedVideoUrl = await resolveExternalVideoUrl(
          nwbUrl,
          path,
          searchParams.get("dandisetId"),
          searchParams.get("dandisetVersion") || "draft",
        );
        if (!canceled) {
          setVideoUrl(resolvedVideoUrl);
        }
      } catch (err) {
        if (!canceled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (!canceled) {
          setLoading(false);
        }
      }
    };
    load();
    return () => {
      canceled = true;
    };
  }, [nwbUrl, path, searchParams]);

  if (loading) {
    return <div style={{ padding: "20px" }}>Resolving external video...</div>;
  }

  if (error) {
    return <div style={{ padding: "20px", color: "red" }}>{error}</div>;
  }

  if (!videoUrl) {
    return (
      <div style={{ padding: "20px", color: "red" }}>
        No playable external video URL was found.
      </div>
    );
  }

  return <VideoViewer videoUrl={videoUrl} width={width} height={height} />;
};

export default ExternalFileVideoView;
