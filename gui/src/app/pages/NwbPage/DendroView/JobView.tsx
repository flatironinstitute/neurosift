/* eslint-disable @typescript-eslint/no-explicit-any */
import { Hyperlink, SmallIconButton } from "@fi-sci/misc";
import { Download, Refresh } from "@mui/icons-material";
import { DendroJob } from "app/dendro/dendro-types";
import { timeAgoString } from "app/timeStrings";
import {
  FunctionComponent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useJobProducingOutput } from "./useJobProducingOutput";
import { ExpandableSection } from "./ExpandableSection";
import ResourceUtilizationView from "./ResourceUtilizationView/ResourceUtilizationView";
import formatByteCount from "./formatByteCount";

type JobViewProps = {
  job: DendroJob;
  refreshJob?: () => void;
  deleteJob?: () => void;
};

export const JobView: FunctionComponent<JobViewProps> = ({
  job,
  refreshJob,
  deleteJob,
}) => {
  return (
    <div>
      {refreshJob && (
        <div>
          <SmallIconButton
            onClick={refreshJob}
            icon={<Refresh />}
            label="Refresh job"
            title="Refresh job"
          />
        </div>
      )}
      <table className="table" style={{ maxWidth: 500 }}>
        <tbody>
          <tr>
            <td>Job</td>
            <td>{job.jobId}</td>
          </tr>
          <tr>
            <td>Job definition hash</td>
            <td>{job.jobDefinitionHash}</td>
          </tr>
          <tr>
            <td>Service</td>
            <td>{job.serviceName}</td>
          </tr>
          <tr>
            <td>App</td>
            <td>{job.jobDefinition.appName}</td>
          </tr>
          <tr>
            <td>Processor</td>
            <td>{job.jobDefinition.processorName}</td>
          </tr>
          <tr>
            <td>User</td>
            <td>{job.userId}</td>
          </tr>
          <tr>
            <td>Status</td>
            <td>{job.status}</td>
          </tr>
          <tr>
            <td>Created</td>
            <td>{timeAgoString(job.timestampCreatedSec)}</td>
          </tr>
          <tr>
            <td>Starting</td>
            <td>
              {job.timestampStartingSec
                ? timeAgoString(job.timestampStartingSec)
                : ""}
            </td>
          </tr>
          <tr>
            <td>Started</td>
            <td>
              {job.timestampStartedSec
                ? timeAgoString(job.timestampStartedSec)
                : ""}
            </td>
          </tr>
          <tr>
            <td>Finished</td>
            <td>
              {job.timestampFinishedSec
                ? timeAgoString(job.timestampFinishedSec)
                : ""}
            </td>
          </tr>
          <tr>
            <td>Elapsed</td>
            <td>
              {job.timestampStartedSec && job.timestampFinishedSec
                ? formatTimeSec(
                    job.timestampFinishedSec - job.timestampStartedSec,
                  )
                : ""}
            </td>
          </tr>
          <tr>
            <td>Error</td>
            <td>{job.error}</td>
          </tr>
          <tr>
            <td>Required resources</td>
            <td>
              <pre>{JSON.stringify(job.requiredResources)}</pre>
            </td>
          </tr>
          <tr>
            <td>Target compute clients</td>
            <td>{(job.targetComputeClientIds || []).join(", ")}</td>
          </tr>
          <tr>
            <td>Job dependencies</td>
            <td>
              {job.jobDependencies.map((jobId) => (
                <>{jobId}</>
              ))}
            </td>
          </tr>
        </tbody>
      </table>
      <hr />
      <InputsOutputsParametersView job={job} />
      {deleteJob && <button onClick={deleteJob}>Delete job</button>}
      <hr />
      <ResourceUtilizationSection job={job} />
      <hr />
      <ConsoleOutputView job={job} />
      <hr />
    </div>
  );
};

type ResourceUtilizationViewProps = {
  job: DendroJob;
};

const ResourceUtilizationSection: FunctionComponent<
  ResourceUtilizationViewProps
> = ({ job }) => {
  return (
    <ExpandableSection title="Resource utilization" defaultExpanded={false}>
      <ResourceUtilizationView displayJobId={false} job={job} />
    </ExpandableSection>
  );
};

type ConsoleOutputViewProps = {
  job: DendroJob;
};

const ConsoleOutputView: FunctionComponent<ConsoleOutputViewProps> = ({
  job,
}) => {
  const { text, refreshText } = useRemoteText(job.consoleOutputUrl);
  useEffect(() => {
    // if job changes, refresh text
    refreshText();
  }, [job, refreshText]);
  return (
    <div>
      <h3>Console output</h3>
      <Hyperlink
        onClick={() => {
          refreshText();
        }}
      >
        Refresh
      </Hyperlink>
      <pre style={{ fontSize: 10 }}>{text}</pre>
    </div>
  );
};

const useRemoteText = (url: string) => {
  const [text, setText] = useState<string | null | undefined>(null);
  const [refreshCode, setRefreshCode] = useState(0);
  const refreshText = useCallback(() => {
    setRefreshCode((c) => c + 1);
  }, []);
  useEffect(() => {
    let canceled = false;
    (async () => {
      setText(null);
      const response = await fetch(url);
      if (canceled) return;
      if (response.status === 404) {
        setText(undefined);
        return;
      }
      if (response.status !== 200) {
        setText(`Error: ${response.status}`);
        return;
      }
      const txt = await response.text();
      if (canceled) return;
      setText(txt);
    })();
    return () => {
      canceled = true;
    };
  }, [refreshCode, url]);
  return { text, refreshText };
};

type InputsOutputsParametersViewProps = {
  job: DendroJob;
};

type InputsOutputsParametersViewRow = {
  type: "input" | "output" | "parameter";
  name: string;

  // for inputs and outputs
  fileBaseName?: string;
  size?: number | null | undefined;
  url?: string | undefined;

  // for parameters
  value?: any;
};

const InputsOutputsParametersView: FunctionComponent<
  InputsOutputsParametersViewProps
> = ({ job }) => {
  const rows = useMemo(() => {
    const r: InputsOutputsParametersViewRow[] = [];
    for (const x of job.jobDefinition.inputFiles) {
      r.push({
        type: "input",
        name: x.name,
        fileBaseName: x.fileBaseName,
        size: undefined,
        url: x.url,
      });
    }
    for (const x of job.jobDefinition.outputFiles) {
      const xr = job.outputFileResults.find((y) => y.name === x.name);
      r.push({
        type: "output",
        name: x.name,
        fileBaseName: x.fileBaseName,
        size: xr ? xr.size : undefined,
        url: xr ? xr.url : undefined,
      });
    }
    for (const x of job.jobDefinition.parameters) {
      r.push({
        type: "parameter",
        name: x.name,
        value: x.value,
      });
    }
    return r;
  }, [job]);
  return (
    <table className="table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Type</th>
          <th>Value / URL</th>
          <th>Size</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => {
          const doLinkToFile =
            row.url &&
            (row.url.endsWith(".json") ||
              (row.size !== undefined &&
                row.size !== null &&
                row.size < 1000 * 1000 * 10));
          return (
            <tr key={i}>
              <td>{row.name}</td>
              <td>{row.type}</td>
              <td style={{ maxWidth: 100, wordWrap: "break-word" }}>
                {row.url ? (
                  <>{
                  doLinkToFile ? (
                    <>
                      <span>{row.url}</span>&nbsp;
                      <a
                        href={row.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: 14 }}
                      >
                        <Download fontSize="inherit" />
                      </a>
                    </>
                  ) : (
                    <span>{row.url || ""}</span>
                  )
                  }&nbsp;
                  {row.type === 'input' && <LinkToJobFromInputFile url={row.url} />}
                  </>
                ) : (
                  <span>{formatValue(row.value)}</span>
                )}
              </td>
              <td>{row.size ? formatByteCount(row.size) : ""}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

const LinkToJobFromInputFile: FunctionComponent<{ url: string }> = ({ url }) => {
  const job = useJobProducingOutput(url);
  if (!job) return <></>

  return (
    <a
      href={`https://dendro.vercel.app/job/${job.jobId}`}
      target="_blank"
      rel="noopener noreferrer"
    >
      open job
    </a>
  )
}

const formatValue = (value: any) => {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number") {
    return `${value}`;
  }
  if (typeof value === "boolean") {
    return `${value}`;
  }
  return JSON.stringify(value);
};

const formatTimeSec = (timeSec: number) => {
  if (timeSec < 60) {
    return `${timeSec} sec`;
  }
  if (timeSec < 60 * 60) {
    const min = Math.floor(timeSec / 60);
    const sec = timeSec - min * 60;
    return `${min} min ${Math.floor(sec)} sec`;
  }
  const hours = Math.floor(timeSec / (60 * 60));
  const min = Math.floor((timeSec - hours * 60 * 60) / 60);
  const sec = timeSec - hours * 60 * 60 - min * 60;
  return `${hours} hr ${min} min ${Math.floor(sec)} sec`;
};

export default JobView;
