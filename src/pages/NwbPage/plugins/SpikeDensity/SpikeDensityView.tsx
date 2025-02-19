import { JobStatusHandler } from "@jobManager/components/JobStatusHandler";
import { useNeurosiftJob } from "@jobManager/useNeurosiftJob";
import { FunctionComponent, useMemo } from "react";
import "../common/loadingState.css";

type Props = {
  width?: number;
  nwbUrl: string;
  path: string;
  condensed?: boolean;
};

interface JobResult {
  output_url: string;
}

interface JobInput {
  nwb_url: string;
  units_path: string;
  bin_size_msec: number;
}

const SpikeDensityView: FunctionComponent<Props> = ({ nwbUrl, path }) => {
  const input: JobInput = useMemo<JobInput>(
    () => ({
      nwb_url: nwbUrl,
      units_path: path,
      bin_size_msec: 20,
      version: 1,
    }),
    [nwbUrl, path],
  );

  const { job, result, error, isRefreshing, submitJob, fetchJobStatus } =
    useNeurosiftJob<JobInput, JobResult>("multiscale_spike_density", input);

  if (job?.status !== "completed") {
    return (
      <JobStatusHandler
        job={job}
        error={error}
        isRefreshing={isRefreshing}
        onSubmit={submitJob}
        onRefresh={fetchJobStatus}
        submitButtonLabel="Compute Multi-scale Spike Density"
      />
    );
  }

  if (!result) {
    return <div>No results available</div>;
  }

  return <div>{result.output_url}</div>;
};

export default SpikeDensityView;
