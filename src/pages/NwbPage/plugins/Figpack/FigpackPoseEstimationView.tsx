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

interface FigpackPoseEstimationInput {
  nwb_url: string;
  path: string;
}

interface FigpackPoseEstimationOutput {
  figpack_url: string;
}

const FigpackPoseEstimationView: FunctionComponent<Props> = ({
  width,
  height,
  nwbUrl,
  path,
}) => {
  const jobInput = useMemo<FigpackPoseEstimationInput>(
    () => ({
      nwb_url: nwbUrl,
      path,
      neurosift_url: window.location.href,
      dandiset_id: dandisetIdFromUrl(window.location.href),
    }),
    [nwbUrl, path],
  );

  const isRemoteFile = nwbUrl.startsWith("https://");

  const { job, result, error, isLoading, submitJob, refreshStatus } =
    useRunpackJob<FigpackPoseEstimationInput, FigpackPoseEstimationOutput>(
      "figpack_nwb_pose_estimation",
      jobInput,
      { enabled: isRemoteFile },
    );

  const showFigure = job?.status === "completed" && result?.figpack_url;

  if (!isRemoteFile) {
    return (
      <div style={{ color: "blue" }}>
        Figpack Pose Estimation generation can only be used with publicly
        accessible NWB files served over HTTPS.
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <FigpackJobStatusDisplay
        job={job}
        error={error}
        isLoading={isLoading}
        submitJob={submitJob}
        refreshStatus={refreshStatus}
        generateButtonText="Generate Figpack Pose Estimation"
      />

      {showFigure && result && (
        <FigpackIframeDisplay
          width={width}
          height={height}
          figpackUrl={result.figpack_url}
          title="Figpack Pose Estimation"
        />
      )}
    </div>
  );
};

export const dandisetIdFromUrl = (url: string): string => {
  const urlObj = new URL(url);
  return urlObj.searchParams.get("dandisetId") || "";
};

export default FigpackPoseEstimationView;
