import { InlineMessage } from "@ui";
import { dandisetIdFromUrl } from "./dandisetIdFromUrl";
import { FunctionComponent, useMemo } from "react";
import FigpackIframeDisplay from "./FigpackIframeDisplay";
import FigpackJobStatusDisplay from "./FigpackJobStatusDisplay";
import { useRunpackJob } from "./useRunpackJob";
import "./Figpack.css";

export type FigpackViewProps = {
  width?: number;
  height?: number;
  nwbUrl: string;
  path: string;
  condensed?: boolean;
};

type Props = FigpackViewProps & {
  jobType: string;
  /** The job input that names the object, such as units_path. */
  pathKey: string;
  /** Such as “Raster Plot”, after “Figpack”. */
  figure: string;
};

type FigpackOutput = { figpack_url: string };

/** A figure built by a Figpack job on the runpack service, then shown in a frame. */
const FigpackJobView: FunctionComponent<Props> = ({
  width,
  height,
  nwbUrl,
  path,
  jobType,
  pathKey,
  figure,
}) => {
  const jobInput = useMemo(
    () => ({
      nwb_url: nwbUrl,
      [pathKey]: path,
      neurosift_url: window.location.href,
      dandiset_id: dandisetIdFromUrl(window.location.href),
    }),
    [nwbUrl, path, pathKey],
  );

  const isRemoteFile = nwbUrl.startsWith("https://");

  const { job, result, error, isLoading, submitJob, refreshStatus } =
    useRunpackJob<typeof jobInput, FigpackOutput>(jobType, jobInput, {
      enabled: isRemoteFile,
    });

  if (!isRemoteFile) {
    return (
      <InlineMessage status="info">
        Figpack {figure} generation can only be used with publicly accessible
        NWB files served over HTTPS.
      </InlineMessage>
    );
  }

  return (
    <div className="figpack-view">
      <FigpackJobStatusDisplay
        job={job}
        error={error}
        isLoading={isLoading}
        submitJob={submitJob}
        refreshStatus={refreshStatus}
        generateButtonText={`Generate Figpack ${figure}`}
      />

      {job?.status === "completed" && result?.figpack_url && (
        <FigpackIframeDisplay
          width={width}
          height={height}
          figpackUrl={result.figpack_url}
          title={`Figpack ${figure}`}
        />
      )}
    </div>
  );
};

export default FigpackJobView;
