import { FunctionComponent, useMemo } from "react";
import { useRunpackJob } from "./useRunpackJob";
import FigpackJobStatusDisplay from "./FigpackJobStatusDisplay";
import FigpackIframeDisplay from "./FigpackIframeDisplay";
import "../common/loadingState.css";

type Props = {
  width?: number;
  height?: number;
  nwbUrl: string;
  path: string;
  condensed?: boolean;
};

interface FigpackViewPreviewInput {
  nwb_url: string;
  image_series_path: string;
}

interface FigpackVideoPreviewOutput {
  figpack_url: string;
}

const FigpackVideoPreviewView: FunctionComponent<Props> = ({
  width,
  height,
  nwbUrl,
  path,
}) => {
  const jobInput = useMemo<FigpackViewPreviewInput>(
    () => ({
      nwb_url: nwbUrl,
      image_series_path: path,
    }),
    [nwbUrl, path],
  );

  const { job, result, error, isLoading, submitJob, refreshStatus } =
    useRunpackJob<FigpackViewPreviewInput, FigpackVideoPreviewOutput>(
      "figpack_nwb_video_preview",
      jobInput,
    );

  const showFigure = job?.status === "completed" && result?.figpack_url;

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <FigpackJobStatusDisplay
        job={job}
        error={error}
        isLoading={isLoading}
        submitJob={submitJob}
        refreshStatus={refreshStatus}
        generateButtonText="Generate Figpack Video Preview"
      />

      {showFigure && result && (
        <FigpackIframeDisplay
          width={width}
          height={height}
          figpackUrl={result.figpack_url}
          title="Figpack Video Preview"
        />
      )}
    </div>
  );
};

export default FigpackVideoPreviewView;
