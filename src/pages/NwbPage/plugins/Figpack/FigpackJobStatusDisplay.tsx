import { Alert, Badge, Button, type AlertAction } from "@ui";
import { FunctionComponent } from "react";
import "./Figpack.css";

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

const jobUrl = (jobId: string) =>
  `https://runpack-admin.neurosift.app/jobs/${jobId}`;

/** Where a Figpack job stands: generate it, wait for it, or try again. */
const FigpackJobStatusDisplay: FunctionComponent<Props> = ({
  job,
  error,
  isLoading,
  submitJob,
  refreshStatus,
  generateButtonText,
}) => {
  const viewJob: AlertAction | undefined = job?.job_id
    ? { label: "View job", href: jobUrl(job.job_id), newTab: true }
    : undefined;
  const withViewJob = (action: AlertAction) =>
    viewJob
      ? ([action, viewJob] as [AlertAction, AlertAction])
      : ([action] as [AlertAction]);
  const refresh = withViewJob({
    label: "Refresh status",
    onClick: refreshStatus,
    loading: isLoading,
  });
  const waiting = job?.status === "pending" || job?.status === "claimed";

  return (
    <div className="figpack-job">
      {!job && (
        <div>
          <Button variant="primary" onClick={submitJob}>
            {generateButtonText}
          </Button>
        </div>
      )}

      {waiting && (
        <Alert status="info" title="Job pending" actions={refresh}>
          Your job is queued and waiting for a worker to process it.
        </Alert>
      )}

      {job?.status === "in_progress" && (
        <Alert status="info" title="Job in progress" actions={refresh}>
          A worker is building the figure.
        </Alert>
      )}

      {job?.status === "completed" && (
        <div className="figpack-job-done">
          <Badge status="success" icon>
            Job completed
          </Badge>
          {job.job_id && (
            <Button
              variant="ghost"
              size="sm"
              href={jobUrl(job.job_id)}
              target="_blank"
              rel="noopener noreferrer"
            >
              View job
            </Button>
          )}
        </div>
      )}

      {(job?.status === "failed" || error) && (
        <Alert
          status="error"
          title="Job failed"
          actions={withViewJob({ label: "Retry job", onClick: submitJob })}
        >
          {error || job?.error || "An unknown error occurred"}
        </Alert>
      )}

      {job?.status === "expired" && (
        <Alert
          status="warning"
          title="Job expired"
          actions={withViewJob({ label: "Submit new job", onClick: submitJob })}
        >
          The job output has expired.
        </Alert>
      )}
    </div>
  );
};

export default FigpackJobStatusDisplay;
