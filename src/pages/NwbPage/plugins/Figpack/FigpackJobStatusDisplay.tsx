import { FunctionComponent } from "react";

type Job = {
  job_id?: string;
  status: string;
  error?: string;
};

type Props = {
  job: Job | null;
  error: string | null;
  isLoading: boolean;
  submitJob: () => void;
  refreshStatus: () => void;
  generateButtonText: string;
};

const FigpackJobStatusDisplay: FunctionComponent<Props> = ({
  job,
  error,
  isLoading,
  submitJob,
  refreshStatus,
  generateButtonText,
}) => {
  return (
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
            {generateButtonText}
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
            Job Status:{" "}
            {job.job_id ? (
              <a
                href={`https://runpack-admin.neurosift.app/jobs/${job.job_id}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#d4a700", textDecoration: "underline" }}
              >
                Pending
              </a>
            ) : (
              "Pending"
            )}
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
            Job Status:{" "}
            {job.job_id ? (
              <a
                href={`https://runpack-admin.neurosift.app/jobs/${job.job_id}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#1890ff", textDecoration: "underline" }}
              >
                In Progress
              </a>
            ) : (
              "In Progress"
            )}
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
          ✓{" "}
          {job.job_id ? (
            <a
              href={`https://runpack-admin.neurosift.app/jobs/${job.job_id}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#52c41a", textDecoration: "underline" }}
            >
              Job Completed
            </a>
          ) : (
            "Job Completed"
          )}
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
            Job Status:{" "}
            {job?.job_id ? (
              <a
                href={`https://runpack-admin.neurosift.app/jobs/${job.job_id}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#ff4d4f", textDecoration: "underline" }}
              >
                Failed
              </a>
            ) : (
              "Failed"
            )}
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
            Job Status:{" "}
            {job.job_id ? (
              <a
                href={`https://runpack-admin.neurosift.app/jobs/${job.job_id}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#ff4d4f", textDecoration: "underline" }}
              >
                Expired
              </a>
            ) : (
              "Expired"
            )}
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
  );
};

export default FigpackJobStatusDisplay;
