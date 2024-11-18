import { Hyperlink } from "@fi-sci/misc";
import { FunctionComponent } from "react";
import { DendroJob } from "./dendro-types";
import { timeAgoString } from "../../utils/timeStrings";
import "./scientific-table.css";

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
          <th>Service</th>
          <th>App/Processor</th>
          <th>Status</th>
          <th>Error</th>
          <th>User</th>
          <th>Compute client</th>
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
            <td>{job.serviceName}</td>
            <td>
              {job.jobDefinition.appName}/{job.jobDefinition.processorName}
            </td>
            <td>
              {job.status === "pending"
                ? job.isRunnable
                  ? "runnable"
                  : "pending"
                : job.status}
            </td>
            <td>{job.error}</td>
            <td>{job.userId}</td>
            <td>{job.computeClientName || ""}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

const abbreviateJobId = (jobId: string, maxLength: number = 5) => {
  if (jobId.length <= maxLength) return jobId;
  return jobId.slice(0, maxLength) + "...";
};

export default JobsTable;
