import { Hyperlink, SmallIconButton } from "@fi-sci/misc";
import { OpenInNew, Refresh } from "@mui/icons-material";
import { FunctionComponent, useCallback, useEffect, useState } from "react";
import {
  GetJobRequest,
  FindJobsRequest,
  DendroJob,
  isGetJobResponse,
  isFindJobsResponse,
} from "../../misc/dendro/dendro-types";
import { timeAgoString } from "../../utils/timeStrings";

export const useAllJobs = (o: {
  serviceName?: string;
  appName?: string;
  processorName?: string;
  tags?: any;
  inputFileUrl?: string;
  jobFilter?: (job: DendroJob) => boolean;
}) => {
  const { serviceName, appName, processorName, tags, inputFileUrl, jobFilter } =
    o;
  const [allJobs, setAllJobs] = useState<DendroJob[] | undefined | null>(
    undefined,
  );
  const [refreshCode, setRefreshCode] = useState(0);
  const refreshAllJobs = useCallback(() => {
    setRefreshCode((c) => c + 1);
  }, []);
  useEffect(() => {
    let canceled = false;
    if (!tags && !(processorName && appName)) return undefined;
    (async () => {
      setAllJobs(undefined);
      const req: FindJobsRequest = {
        type: "findJobsRequest",
        serviceName: serviceName || "hello_world_service",
        appName,
        processorName,
        tags: tags && tags.length > 0 ? { $all: tags } : undefined,
        inputFileUrl,
      };
      const headers = {
        "Content-Type": "application/json",
      };
      const resp = await fetch("https://dendro.vercel.app/api/findJobs", {
        method: "POST",
        headers,
        body: JSON.stringify(req),
      });
      if (canceled) return;
      if (!resp.ok) {
        console.error("Error fetching jobs:", resp);
        setAllJobs(null);
        return undefined;
      }
      const rr = await resp.json();
      if (!isFindJobsResponse(rr)) {
        console.error("Unexpected response:", rr);
        setAllJobs(null);
        return undefined;
      }
      const jobs = jobFilter ? rr.jobs.filter(jobFilter) : rr.jobs;
      setAllJobs(jobs);
    })();
    return () => {
      canceled = true;
    };
  }, [
    serviceName,
    appName,
    processorName,
    inputFileUrl,
    refreshCode,
    tags,
    jobFilter,
  ]);
  return { allJobs, refreshAllJobs };
};

export const useDendroApiKey = () => {
  // save in local storage
  const [dendroApiKey, setDendroApiKey] = useState<string>(
    localStorage.getItem("dendroApiKey") || "",
  );
  useEffect(() => {
    localStorage.setItem("dendroApiKey", dendroApiKey);
  }, [dendroApiKey]);
  return { dendroApiKey, setDendroApiKey };
};

export const SelectDendroApiKeyComponent: FunctionComponent<{
  value: string;
  setValue: (value: string) => void;
}> = ({ value, setValue }) => {
  return (
    <div>
      <label>
        <a
          href="https://dendro.vercel.app/settings"
          target="_blank"
          rel="noopener noreferrer"
        >
          Dendro API key
        </a>
        :&nbsp;
      </label>
      <input
        type="password"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
    </div>
  );
};

export const SelectDendroComputeClientIdComponent: FunctionComponent<{
  value: string | undefined;
  setValue: (value: string | undefined) => void;
}> = ({ value, setValue }) => {
  return (
    <div>
      <label>Compute client (optional):&nbsp;</label>
      <input
        value={value || ""}
        onChange={(e) => setValue(e.target.value || undefined)}
      />
    </div>
  );
};

export const useJob = (jobId: string | undefined) => {
  const [job, setJob] = useState<DendroJob | undefined>(undefined);
  const [refreshCode, setRefreshCode] = useState(0);
  const refreshJob = useCallback(() => {
    setRefreshCode((c) => c + 1);
  }, []);
  useEffect(() => {
    if (!jobId) {
      setJob(undefined);
      return;
    }
    let canceled = false;
    (async () => {
      setJob(undefined);
      const req: GetJobRequest = {
        type: "getJobRequest",
        jobId,
        includePrivateKey: false,
      };
      const headers = {
        "Content-Type": "application/json",
      };
      const resp = await fetch("https://dendro.vercel.app/api/getJob", {
        method: "POST",
        headers,
        body: JSON.stringify(req),
      });
      if (canceled) return;
      if (!resp.ok) {
        console.error("Error fetching job:", resp);
        return;
      }
      const data = await resp.json();
      if (!isGetJobResponse(data)) {
        console.error("Unexpected response:", data);
        return;
      }
      setJob(data.job);
    })();
    return () => {
      canceled = true;
    };
  }, [jobId, refreshCode]);
  return { job, refreshJob };
};

export const MultipleChoiceNumberSelector: FunctionComponent<{
  value: number;
  setValue: (value: number) => void;
  choices: number[];
}> = ({ value, setValue, choices }) => {
  return (
    <select value={value} onChange={(e) => setValue(parseInt(e.target.value))}>
      {choices.map((choice) => (
        <option key={choice} value={choice}>
          {choice}
        </option>
      ))}
    </select>
  );
};

export const MultipleChoiceStringSelector: FunctionComponent<{
  value: string;
  setValue: (value: string) => void;
  choices: string[];
}> = ({ value, setValue, choices }) => {
  return (
    <select value={value} onChange={(e) => setValue(e.target.value)}>
      {choices.map((choice) => (
        <option key={choice} value={choice}>
          {choice}
        </option>
      ))}
    </select>
  );
};

export const getJobOutputUrl = (
  job: DendroJob | undefined,
  outputName: string,
) => {
  if (!job) return undefined;
  const oo = job.outputFileResults.find((r) => r.name === outputName);
  if (!oo) return undefined;
  return oo.url;
};

export const getJobParameterValue = (
  job: DendroJob | undefined,
  parameterName: string,
) => {
  if (!job) return undefined;
  const pp = job.jobDefinition.parameters.find(
    (pp) => pp.name === parameterName,
  );
  if (!pp) return undefined;
  return pp.value;
};

type AllJobsViewProps = {
  allJobs: DendroJob[] | undefined;
  refreshAllJobs: () => void;
  parameterNames: string[];
  selectedJobId: string | undefined;
  onJobClicked: (jobId: string) => void;
};

export const AllJobsView: FunctionComponent<AllJobsViewProps> = ({
  allJobs,
  refreshAllJobs,
  parameterNames,
  onJobClicked,
  selectedJobId,
}) => {
  if (!allJobs) return <div></div>;
  if (allJobs.length === 0) return <div>No jobs found</div>;
  return (
    <AllJobsTable
      allJobs={allJobs}
      refreshAllJobs={refreshAllJobs}
      parameterNames={parameterNames}
      selectedJobId={selectedJobId}
      onJobClicked={onJobClicked}
    />
  );
};

type AllJobsTableProps = {
  allJobs: DendroJob[];
  refreshAllJobs: () => void;
  parameterNames: string[];
  selectedJobId: string | undefined;
  onJobClicked: (jobId: string) => void;
};

const AllJobsTable: FunctionComponent<AllJobsTableProps> = ({
  allJobs,
  refreshAllJobs,
  parameterNames,
  selectedJobId,
  onJobClicked,
}) => {
  return (
    <div>
      <div>
        <SmallIconButton icon={<Refresh />} onClick={refreshAllJobs} />
      </div>
      <table className="nwb-table">
        <thead>
          <tr>
            <th>Job</th>
            <th>Status</th>
            {parameterNames.map((pn) => (
              <th key={pn}>{pn}</th>
            ))}
            <th>Created</th>
            {<th />}
          </tr>
        </thead>
        <tbody>
          {allJobs.map((job) => (
            <tr
              key={job.jobId}
              style={
                job.jobId === selectedJobId ? { background: "#afafaf" } : {}
              }
            >
              <td>
                <Hyperlink onClick={() => onJobClicked(job.jobId)}>
                  SELECT
                </Hyperlink>
              </td>
              <td>{job.status}</td>
              {parameterNames.map((pn) => (
                <td key={pn}>{formatValue(getJobParameter(job, pn))}</td>
              ))}
              <td>{timeAgoString(job.timestampCreatedSec)}</td>
              <td>
                <SmallIconButton
                  icon={<OpenInNew />}
                  onClick={() => {
                    window.open(
                      `https://dendro.vercel.app/job/${job.jobId}`,
                      "_blank",
                    );
                  }}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export const formatValue = (value: any) => {
  if (value === undefined) return "";
  if (value === null) return "null";
  if (typeof value === "object") {
    if (Array.isArray(value)) {
      const isAllInts = value.every(
        (v) => typeof v === "number" && v % 1 === 0,
      );
      if (isAllInts) {
        return intListToString(value);
      } else {
        return value.join(", ");
      }
    }
    return JSON.stringify(value);
  }
  return value;
};

const getJobParameter = (job: DendroJob, parameterName: string) => {
  const pp = job.jobDefinition.parameters.find(
    (pp) => pp.name === parameterName,
  );
  if (!pp) return undefined;
  return pp.value;
};

// type ExpandableProps = {
//   title: string;
//   expanded: boolean;
//   setExpanded: (expanded: boolean) => void;
// };

// const Expandable: FunctionComponent<PropsWithChildren<ExpandableProps>> = ({
//   title,
//   expanded,
//   setExpanded,
//   children,
// }) => {
//   return (
//     <div>
//       <div
//         style={{
//           cursor: "pointer",
//           padding: 10,
//           background: "#f8f8f8",
//           border: "solid 1px #ccc",
//         }}
//         onClick={() => setExpanded(!expanded)}
//       >
//         {expanded ? "▼" : "►"} {title}
//       </div>
//       {expanded && <div style={{ padding: 10 }}>{children}</div>}
//     </div>
//   );
// };

export const removeLeadingSlash = (path: string) => {
  if (path.startsWith("/")) return path.slice(1);
  return path;
};

export const intListToString = (v: number[]) => {
  const vSorted = v.slice().sort((a, b) => a - b);
  const runs: number[][] = [];
  let currentRun: number[] = [];
  for (let i = 0; i < vSorted.length; i++) {
    if (currentRun.length === 0) {
      currentRun.push(vSorted[i]);
    } else {
      if (vSorted[i] === currentRun[currentRun.length - 1] + 1) {
        currentRun.push(vSorted[i]);
      } else {
        runs.push(currentRun);
        currentRun = [vSorted[i]];
      }
    }
  }
  if (currentRun.length > 0) {
    runs.push(currentRun);
  }
  let ret = "";
  for (const run of runs) {
    if (ret) ret += ", ";
    if (run.length === 1) {
      ret += run[0].toString();
    } else {
      ret += `${run[0]}-${run[run.length - 1]}`;
    }
  }
  return ret;
};
