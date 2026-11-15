import { useCssVars } from "@components/useCssVars";
import { LoadingState, ViewPanel } from "@ui";
import { FunctionComponent, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  describeVideoPlaybackError,
  getExternalFileForSeries,
  resolveExternalVideoFromFile,
  VideoProblem,
  videoProblemOf,
} from "../../externalVideoUtils";
import VideoUnavailable from "../../VideoUnavailable";
import { TIME_VIEW_CHROME } from "../common/TimeView";
import "./ExternalFileVideoView.css";

type Props = {
  width?: number;
  height?: number;
  nwbUrl: string;
  path: string;
};

const ExternalFileVideoView: FunctionComponent<Props> = ({
  height = 600,
  nwbUrl,
  path,
}) => {
  const [searchParams] = useSearchParams();
  const [externalFile, setExternalFile] = useState<string>();
  const [videoUrl, setVideoUrl] = useState<string>();
  const [problem, setProblem] = useState<VideoProblem>();
  const frameRef = useCssVars<HTMLDivElement>({
    "--video-h": Math.max(160, height - TIME_VIEW_CHROME),
  });

  useEffect(() => {
    let canceled = false;
    setExternalFile(undefined);
    setVideoUrl(undefined);
    setProblem(undefined);
    (async () => {
      try {
        const file = await getExternalFileForSeries(nwbUrl, path);
        if (canceled) return;
        setExternalFile(file);
        const url = await resolveExternalVideoFromFile(
          nwbUrl,
          file,
          searchParams.get("dandisetId"),
          searchParams.get("dandisetVersion") || "draft",
        );
        if (!canceled) setVideoUrl(url);
      } catch (err) {
        if (!canceled) setProblem(videoProblemOf(err));
      }
    })();
    return () => {
      canceled = true;
    };
  }, [nwbUrl, path, searchParams]);

  const name = path.split("/").pop() || path;
  return (
    <ViewPanel
      label={name}
      summary={
        externalFile ? `Video in an external file, ${externalFile}` : "Video"
      }
      controls={null}
      chartTitle={name}
      busy={!videoUrl && !problem}
    >
      <div ref={frameRef}>
        {problem ? (
          <VideoUnavailable problem={problem} />
        ) : !videoUrl ? (
          <LoadingState label="Finding the video on DANDI" phase="loading" />
        ) : (
          <video
            className="external-video"
            controls
            src={videoUrl}
            onError={() =>
              describeVideoPlaybackError(videoUrl).then(setProblem)
            }
          />
        )}
      </div>
    </ViewPanel>
  );
};

export default ExternalFileVideoView;
