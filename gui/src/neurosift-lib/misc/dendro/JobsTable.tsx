import { Hyperlink } from "@fi-sci/misc";
import { FunctionComponent } from "react";
import { DendroJob, DendroJobStatus } from "./dendro-types";
import { timeAgoString } from "../../utils/timeStrings";
import "./scientific-table.css";
import useRoute from "../../contexts/useRoute";

type JobsTableProps = {
  jobs: DendroJob[];
  selectedJobIds?: string[];
  onSelectedJobIdsChanged?: (selectedJobIds: string[]) => void;
};

const JobsTable: FunctionComponent<JobsTableProps> = ({
  jobs,
  selectedJobIds,
  onSelectedJobIdsChanged,
}) => {
  return (
    <table className="scientific-table">
      <thead>
        <tr>
          {selectedJobIds && <th />}
          <th>Job</th>
          <th>Created</th>
          <th>Updated</th>
          <th>Service</th>
          <th>App/Processor</th>
          <th>Status</th>
          <th>Error</th>
          <th>User</th>
          <th>Compute client</th>
          <th>Dandiset</th>
        </tr>
      </thead>
      <tbody>
        {jobs.map((job) => (
          <tr key={job.jobId}>
            {selectedJobIds && (
              <td>
                <input
                  type="checkbox"
                  checked={selectedJobIds.includes(job.jobId)}
                  onChange={(e) => {
                    if (onSelectedJobIdsChanged) {
                      if (e.target.checked) {
                        onSelectedJobIdsChanged([...selectedJobIds, job.jobId]);
                      } else {
                        onSelectedJobIdsChanged(
                          selectedJobIds.filter((id) => id !== job.jobId),
                        );
                      }
                    }
                  }}
                />
              </td>
            )}
            <td>
              <Hyperlink
                onClick={() => {
                  const url = `https://dendro.vercel.app/job/${job.jobId}`;
                  window.open(url, "_blank");
                }}
              >
                {abbreviateJobId(job.jobId)}
              </Hyperlink>
            </td>
            <td>{timeAgoString(job.timestampCreatedSec)}</td>
            <td>
              {job.timestampUpdatedSec
                ? timeAgoString(job.timestampUpdatedSec)
                : ""}
            </td>
            <td>{job.serviceName}</td>
            <td>
              {job.jobDefinition.appName}/{job.jobDefinition.processorName}
            </td>
            <td>
              <span
                style={{ color: colorForJobStatus(job.status, job.isRunnable) }}
              >
                {job.status === "pending"
                  ? job.isRunnable
                    ? "runnable"
                    : "pending"
                  : job.status}
                {(job.status === "completed" || job.status === "failed") &&
                  ` (${computeDurationString(job)})`}
              </span>
            </td>
            <td>{job.error}</td>
            <td>{job.userId}</td>
            <td>{job.computeClientName || ""}</td>
            <td>
              {
                <DandisetLink
                  dandisetId={
                    (job.tags || [])
                      .find((t) => t.startsWith("dandiset:"))
                      ?.split(":")[1]
                  }
                />
              }
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

const colorForJobStatus = (status: DendroJobStatus, isRunnable: boolean) => {
  if (status === "pending") {
    return isRunnable ? "darkmagenta" : "black";
  }
  if (status === "running") return "darkblue";
  if (status === "completed") return "darkgreen";
  if (status === "failed") return "darkred";
  return "black";
};

const abbreviateJobId = (jobId: string, maxLength: number = 5) => {
  if (jobId.length <= maxLength) return jobId;
  return jobId.slice(0, maxLength) + "...";
};

type DandisetLinkProps = {
  dandisetId?: string;
};

const DandisetLink: FunctionComponent<DandisetLinkProps> = ({ dandisetId }) => {
  const { setRoute } = useRoute();
  if (!dandisetId) return null;
  return (
    <Hyperlink
      onClick={() => {
        setRoute({ page: "dandiset", dandisetId });
      }}
    >
      {dandisetId}
    </Hyperlink>
  );
};

const computeDurationString = (job: DendroJob) => {
  if (!job.timestampStartedSec || !job.timestampFinishedSec) return "";
  const durationSec = job.timestampFinishedSec - job.timestampStartedSec;
  return timeElapsedString(durationSec);
};

const timeElapsedString = (durationSec: number) => {
  if (durationSec < 120) return `${Math.floor(durationSec)}s`;
  const minutes = Math.floor(durationSec / 60);
  if (minutes < 120) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h`;
};

export default JobsTable;
