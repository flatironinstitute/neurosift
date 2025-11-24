import { FunctionComponent } from "react";
import { useSearchParams } from "react-router-dom";
import VideoViewer from "./VideoViewer";

type Props = {
  width: number;
  height: number;
};

const VideoPage: FunctionComponent<Props> = ({ width, height }) => {
  const [searchParams] = useSearchParams();
  const url = searchParams.get("url");
  const dandisetId = searchParams.get("dandisetId");
  const dandisetVersion = searchParams.get("dandisetVersion");

  if (!url) {
    return <div>URL parameter is required</div>;
  }

  // If url contains double quotes at start/end, remove them
  const cleanUrl = url.replace(/^"(.*)"$/, "$1");

  return (
    <VideoViewer
      videoUrl={cleanUrl}
      width={width}
      height={height}
      dandisetId={dandisetId || undefined}
      dandisetVersion={dandisetVersion || undefined}
    />
  );
};

export default VideoPage;
