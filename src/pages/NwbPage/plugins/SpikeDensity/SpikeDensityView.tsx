import { JobStatusHandler } from "@jobManager/components/JobStatusHandler";
import { useNeurosiftJob } from "@jobManager/useNeurosiftJob";
import { FunctionComponent, useEffect, useMemo, useState } from "react";
import HorizontalSplitter from "../../../../components/HorizontalSplitter";
import "../common/loadingState.css";
import SpikeDensityPlotWidget from "./SpikeDensityPlotWidget";

type Props = {
  width?: number;
  height?: number;
  nwbUrl: string;
  path: string;
  condensed?: boolean;
};

interface MultiscaleJobResult {
  output_url: string;
}

interface MultiscaleJobInput {
  nwb_url: string;
  units_path: string;
  bin_size_msec: number;
}

interface RastermapJobResult {
  output_url: string;
}

interface RastermapOutput {
  isort: number[];
}

interface RastermapJobInput {
  nwb_url: string;
  units_path: string;
  n_clusters: number;
  n_PCs: number;
  locality: number;
  grid_upsample: number;
}

const SpikeDensityView: FunctionComponent<Props> = ({
  width,
  height,
  nwbUrl,
  path,
}) => {
  const [useRastermapSorting, setUseRastermapSorting] = useState(false);

  const multiscaleInput = useMemo<MultiscaleJobInput>(
    () => ({
      nwb_url: nwbUrl,
      units_path: path,
      bin_size_msec: 20,
      version: 2,
    }),
    [nwbUrl, path],
  );

  const rastermapInput = useMemo<RastermapJobInput>(
    () => ({
      nwb_url: nwbUrl,
      units_path: path,
      n_clusters: 10,
      n_PCs: 3,
      locality: 1,
      grid_upsample: 1,
      version: 2,
    }),
    [nwbUrl, path],
  );

  const multiscaleJob = useNeurosiftJob<
    MultiscaleJobInput,
    MultiscaleJobResult
  >("multiscale_spike_density", multiscaleInput);

  const rastermapJob = useNeurosiftJob<RastermapJobInput, RastermapJobResult>(
    "rastermap",
    rastermapInput,
  );

  const renderJobStatus = (
    label: string,
    {
      job,
      error,
      isRefreshing,
      submitJob,
      fetchJobStatus,
    }: typeof multiscaleJob,
  ) => (
    <div style={{ marginBottom: "20px" }}>
      <JobStatusHandler
        job={job}
        error={error}
        isRefreshing={isRefreshing}
        onSubmit={submitJob}
        onRefresh={fetchJobStatus}
        jobLabel={label}
      />
    </div>
  );

  const [rastermapOutput, setRastermapOutput] =
    useState<RastermapOutput | null>(null);
  useEffect(() => {
    if (rastermapJob.job?.status === "completed" && rastermapJob.result) {
      fetch(rastermapJob.result.output_url)
        .then((response) => response.json())
        .then(setRastermapOutput);
    }
  }, [rastermapJob.job?.status, rastermapJob.result]);
  const showRastermapToggle =
    multiscaleJob.job?.status === "completed" &&
    rastermapJob.job?.status === "completed" &&
    rastermapOutput !== null;

  return (
    <div
      style={{
        position: "relative",
        width: width || 800,
        height: height || 600,
      }}
    >
      {!multiscaleJob.job?.status || !multiscaleJob.result ? (
        <div style={{ padding: "20px" }}>
          {renderJobStatus("Multi-scale Spike Density", multiscaleJob)}
          {renderJobStatus("Rastermap Sorting", rastermapJob)}
        </div>
      ) : (
        <HorizontalSplitter
          width={width || 800}
          height={height || 600}
          initialSplitterPosition={300}
        >
          <LeftPanel
            multiscaleJob={multiscaleJob}
            rastermapJob={rastermapJob}
            showRastermapToggle={showRastermapToggle}
            useRastermapSorting={useRastermapSorting}
            setUseRastermapSorting={setUseRastermapSorting}
            renderJobStatus={renderJobStatus}
          />
          <SpikeDensityPlotWidget
            width={width || 800}
            height={height || 600}
            multiscaleSpikeDensityOutputUrl={multiscaleJob.result.output_url}
            rastermapOutput={
              useRastermapSorting && rastermapOutput
                ? rastermapOutput
                : undefined
            }
          />
        </HorizontalSplitter>
      )}
    </div>
  );
};

type LeftPanelProps = {
  width?: number;
  height?: number;
  multiscaleJob: ReturnType<
    typeof useNeurosiftJob<MultiscaleJobInput, MultiscaleJobResult>
  >;
  rastermapJob: ReturnType<
    typeof useNeurosiftJob<RastermapJobInput, RastermapJobResult>
  >;
  showRastermapToggle: boolean;
  useRastermapSorting: boolean;
  setUseRastermapSorting: (value: boolean) => void;
  renderJobStatus: <T extends MultiscaleJobResult | RastermapJobResult>(
    label: string,
    job: ReturnType<
      typeof useNeurosiftJob<MultiscaleJobInput | RastermapJobInput, T>
    >,
    buttonLabel: string,
  ) => React.ReactNode;
};

const LeftPanel: FunctionComponent<LeftPanelProps> = ({
  multiscaleJob,
  rastermapJob,
  showRastermapToggle,
  useRastermapSorting,
  setUseRastermapSorting,
  renderJobStatus,
  height,
}) => {
  return (
    <div style={{ height: height || 600, overflowY: "auto", padding: "20px" }}>
      <div style={{ marginBottom: "20px" }}>
        {renderJobStatus(
          "Multi-scale Spike Density",
          multiscaleJob,
          "Compute Multi-scale Spike Density",
        )}
      </div>

      <div style={{ marginBottom: "20px" }}>
        {renderJobStatus(
          "Rastermap Sorting",
          rastermapJob,
          "Compute Rastermap Sorting",
        )}
      </div>

      {showRastermapToggle && (
        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <input
              type="checkbox"
              checked={useRastermapSorting}
              onChange={(e) => setUseRastermapSorting(e.target.checked)}
            />
            Use Rastermap Sorting
          </label>
        </div>
      )}
    </div>
  );
};

export default SpikeDensityView;
