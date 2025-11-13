import { FunctionComponent, useMemo } from "react";
import { useRunpackJob } from "./useRunpackJob";
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
      {/* Status Section */}
      <div style={{ marginBottom: "15px" }}>
        {!job && (
          <div>
            <button
              onClick={submitJob}
              style={{
                padding: "10px 20px",
                fontSize: "14px",
                cursor: "pointer",
                backgroundColor: "#007bff",
                color: "white",
                border: "none",
                borderRadius: "4px",
              }}
            >
              Generate Figpack Video Preview
            </button>
          </div>
        )}

        {job && (job.status === "pending" || job.status === "claimed") && (
          <div
            style={{
              padding: "15px",
              backgroundColor: "#fff9e6",
              border: "1px solid #ffe58f",
              borderRadius: "4px",
            }}
          >
            <p style={{ margin: "0 0 10px 0", fontWeight: "bold" }}>
              Job Status: Pending
            </p>
            <p style={{ margin: "0 0 10px 0" }}>
              Your job is queued and waiting for a worker to process it.
            </p>
            <button
              onClick={refreshStatus}
              disabled={isLoading}
              style={{
                padding: "8px 16px",
                fontSize: "14px",
                cursor: isLoading ? "not-allowed" : "pointer",
                opacity: isLoading ? 0.6 : 1,
              }}
            >
              {isLoading ? "Refreshing..." : "Refresh Status"}
            </button>
          </div>
        )}

        {job && job.status === "in_progress" && (
          <div
            style={{
              padding: "15px",
              backgroundColor: "#e6f7ff",
              border: "1px solid #91d5ff",
              borderRadius: "4px",
            }}
          >
            <p style={{ margin: "0 0 10px 0", fontWeight: "bold" }}>
              Job Status: In Progress
            </p>
            <button
              onClick={refreshStatus}
              disabled={isLoading}
              style={{
                padding: "8px 16px",
                fontSize: "14px",
                cursor: isLoading ? "not-allowed" : "pointer",
                opacity: isLoading ? 0.6 : 1,
              }}
            >
              {isLoading ? "Refreshing..." : "Refresh Status"}
            </button>
          </div>
        )}

        {job && job.status === "completed" && (
          <div
            style={{
              padding: "6px 10px",
              fontSize: "12px",
              color: "#52c41a",
              display: "inline-block",
            }}
          >
            ✓ Job Completed
          </div>
        )}

        {(job?.status === "failed" || error) && (
          <div
            style={{
              padding: "15px",
              backgroundColor: "#fff1f0",
              border: "1px solid #ffccc7",
              borderRadius: "4px",
            }}
          >
            <p
              style={{
                margin: "0 0 10px 0",
                fontWeight: "bold",
                color: "#ff4d4f",
              }}
            >
              Job Failed
            </p>
            <p style={{ margin: "0 0 10px 0", color: "#ff4d4f" }}>
              {error || job?.error || "An unknown error occurred"}
            </p>
            <button
              onClick={submitJob}
              style={{
                padding: "8px 16px",
                fontSize: "14px",
                cursor: "pointer",
                backgroundColor: "#ff4d4f",
                color: "white",
                border: "none",
                borderRadius: "4px",
              }}
            >
              Retry Job
            </button>
          </div>
        )}

        {job?.status === "expired" && (
          <div
            style={{
              padding: "15px",
              backgroundColor: "#fff1f0",
              border: "1px solid #ffccc7",
              borderRadius: "4px",
            }}
          >
            <p
              style={{
                margin: "0 0 10px 0",
                fontWeight: "bold",
                color: "#ff4d4f",
              }}
            >
              Job Expired
            </p>
            <p style={{ margin: "0 0 10px 0", color: "#ff4d4f" }}>
              The job output has expired.
            </p>
            <button
              onClick={submitJob}
              style={{
                padding: "8px 16px",
                fontSize: "14px",
                cursor: "pointer",
                backgroundColor: "#ff4d4f",
                color: "white",
                border: "none",
                borderRadius: "4px",
              }}
            >
              Submit New Job
            </button>
          </div>
        )}
      </div>

      {/* Figpack Figure Display */}
      {showFigure && result && (
        <div
          style={{
            width: width ? width - 40 : "100%",
            height: height ? height - 100 : "calc(100vh - 200px)",
            border: "1px solid #d9d9d9",
            borderRadius: "4px",
            overflow: "hidden",
          }}
        >
          <iframe
            src={result.figpack_url}
            style={{
              width: "100%",
              height: "100%",
              border: "none",
            }}
            title="Figpack Video Preview"
          />
        </div>
      )}
    </div>
  );
};

export default FigpackVideoPreviewView;
