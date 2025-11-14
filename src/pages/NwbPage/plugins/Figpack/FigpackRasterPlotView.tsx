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

interface FigpackRasterPlotInput {
  nwb_url: string;
  units_path: string;
}

interface FigpackRasterPlotOutput {
  figpack_url: string;
}

const FigpackRasterPlotView: FunctionComponent<Props> = ({
  width,
  height,
  nwbUrl,
  path,
}) => {
  const jobInput = useMemo<FigpackRasterPlotInput>(
    () => ({
      nwb_url: nwbUrl,
      units_path: path,
    }),
    [nwbUrl, path],
  );

  const isRemoteFile = nwbUrl.startsWith("https://");

  const { job, result, error, isLoading, submitJob, refreshStatus } =
    useRunpackJob<FigpackRasterPlotInput, FigpackRasterPlotOutput>(
      "figpack_nwb_raster_plot",
      jobInput,
      { enabled: isRemoteFile },
    );

  const showFigure = job?.status === "completed" && result?.figpack_url;

  if (!isRemoteFile) {
    return (
      <div style={{ color: "blue" }}>
        Figpack Raster Plot generation can only be used with publicly accessible
        NWB files served over HTTPS.
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
        generateButtonText="Generate Figpack Raster Plot"
      />

      {showFigure && result && (
        <FigpackIframeDisplay
          width={width}
          height={height}
          figpackUrl={result.figpack_url}
          title="Figpack Raster Plot"
        />
      )}
    </div>
  );
};

export default FigpackRasterPlotView;
