import { JobStatusHandler } from "@jobManager/components/JobStatusHandler";
import { useNeurosiftJob } from "@jobManager/useNeurosiftJob";
import { FunctionComponent, useMemo, useState } from "react";

type Props = {
  width?: number;
  height?: number;
  nwbUrl: string;
  path: string;
  objectType: "group" | "dataset";
};

interface ImageSeriesMp4JobInput {
  nwb_url: string;
  image_series_path: string;
  duration_sec: number;
}

interface ImageSeriesMp4JobResult {
  output_url: string;
}

const ImageSeriesMp4View: FunctionComponent<Props> = ({
  width = 800,
  height = 600,
  nwbUrl,
  path,
}) => {
  const [durationSec, setDurationSec] = useState<number>(60);

  const jobInput = useMemo<ImageSeriesMp4JobInput>(
    () => ({
      nwb_url: nwbUrl,
      image_series_path: path,
      duration_sec: durationSec,
    }),
    [nwbUrl, path, durationSec],
  );

  const job = useNeurosiftJob<ImageSeriesMp4JobInput, ImageSeriesMp4JobResult>(
    "image_series_to_mp4",
    jobInput,
  );

  const showVideo = job.job?.status === "completed" && job.result?.output_url;

  return (
    <div style={{ padding: "20px" }}>
      <div style={{ marginBottom: "20px" }}>
        <label style={{ marginRight: "10px" }}>Duration (seconds): </label>
        <select
          value={durationSec}
          onChange={(e) => setDurationSec(Number(e.target.value))}
          style={{ padding: "5px" }}
        >
          <option value={60}>60 seconds</option>
          <option value={300}>300 seconds</option>
        </select>
      </div>

      <JobStatusHandler
        job={job.job}
        error={job.error}
        isRefreshing={job.isRefreshing}
        onSubmit={job.submitJob}
        onRefresh={job.fetchJobStatus}
        onCancel={job.cancelJob}
        onDelete={job.deleteJob}
        jobLabel="Generate MP4"
        imageName="neurosift-job-runner-2"
      />

      {showVideo && job.result && (
        <div style={{ marginTop: "20px" }}>
          <video
            controls
            style={{
              width: width ? Math.min(width - 40, 800) : 800,
              maxHeight: height ? height - 150 : 450,
            }}
          >
            <source src={job.result.output_url} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>
      )}
    </div>
  );
};

export default ImageSeriesMp4View;
