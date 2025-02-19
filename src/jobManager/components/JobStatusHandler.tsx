import { FunctionComponent } from "react";
import { Job } from "../useNeurosiftJob";

type Props = {
  job: Job | null;
  error: string | null;
  isRefreshing: boolean;
  onSubmit: () => void;
  onRefresh: () => void;
  submitButtonLabel?: string;
};

export const JobStatusHandler: FunctionComponent<Props> = ({
  job,
  error,
  isRefreshing,
  onSubmit,
  onRefresh,
  submitButtonLabel = "Submit Job",
}) => {
  if (!job) {
    return (
      <div>
        <button onClick={onSubmit}>{submitButtonLabel}</button>
      </div>
    );
  }

  const jobId = job._id;

  if (!job || job.status === "pending" || job.status === "running") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {job?.status === "pending" ? (
          <div
            style={{
              padding: "10px",
              border: "1px solid #ccc",
              borderRadius: "4px",
              backgroundColor: "#f5f5f5",
            }}
          >
            <div>
              <p>To process this job using Docker or Apptainer:</p>
              <code
                style={{
                  display: "block",
                  padding: "10px",
                  backgroundColor: "#fff",
                  overflowX: "auto",
                  marginBottom: "15px",
                }}
              >
                docker run
                ghcr.io/flatironinstitute/neurosift-job-runner:main-v2 {jobId}
              </code>
              <code
                style={{
                  display: "block",
                  padding: "10px",
                  backgroundColor: "#fff",
                  overflowX: "auto",
                  marginBottom: "15px",
                }}
              >
                apptainer exec
                docker://ghcr.io/flatironinstitute/neurosift-job-runner:main-v2
                neurosift-job-runner run-job {jobId}
              </code>

              <p>Or for local development:</p>
              <code
                style={{
                  display: "block",
                  padding: "10px",
                  backgroundColor: "#fff",
                  overflowX: "auto",
                }}
              >
                pip install -e neurosift_job_runner && neurosift-job-runner
                run-job {jobId}
              </code>
            </div>
          </div>
        ) : (
          <div>
            <p>Processing... {job?.progress || 0}%</p>
            <div
              style={{
                width: "200px",
                height: "20px",
                border: "1px solid #ccc",
              }}
            >
              <div
                style={{
                  width: `${job?.progress || 0}%`,
                  height: "100%",
                  backgroundColor: "#4CAF50",
                }}
              />
            </div>
          </div>
        )}
        <div>
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            style={{
              opacity: isRefreshing ? 0.7 : 1,
              cursor: isRefreshing ? "not-allowed" : "pointer",
            }}
          >
            {isRefreshing ? "Refreshing..." : "Refresh Status"}
          </button>
        </div>
      </div>
    );
  }

  if (job.status === "failed" || error) {
    return (
      <div
        style={{
          padding: "10px",
          display: "flex",
          flexDirection: "column",
          gap: "15px",
        }}
      >
        <div
          style={{
            backgroundColor: "#fff4f4",
            border: "1px solid #ffcdd2",
            borderRadius: "4px",
            padding: "10px",
            color: "#d32f2f",
          }}
        >
          {error ? `Error: ${error}` : "Job failed"}
        </div>
        <div>
          <button onClick={onSubmit}>Resubmit Job</button>
        </div>
      </div>
    );
  }

  return null;
};
