import {
  CreateJobRequest,
  DendroJob,
  DendroJobDefinition,
  DendroJobRequiredResources,
  isCreateJobResponse,
} from "../../misc/dendro/dendro-types";
import { FunctionComponent, useCallback, useMemo, useState } from "react";
import {
  SelectDendroApiKeyComponent,
  useAllJobs,
} from "../CEBRA/DendroHelpers";
import {
  createDendroJobSecrets,
  isStagingUrl,
} from "../ElectricalSeriesItemView/SpikeSortingView/SpikeSortingView";
import { JobInfoView } from "../CEBRA/DendroItemView";

type MultiscaleTimeSeriesViewProps = {
  width: number;
  height: number;
  nwbUrl: string;
  path: string;
};

const MultiscaleTimeSeriesView: FunctionComponent<
  MultiscaleTimeSeriesViewProps
> = ({ width, height, nwbUrl, path }) => {
  const { dsUrl, job, incompleteJob, refreshAllJobs, submitJob } =
    useDsUrlForNwbUrl(nwbUrl);
  const leftAreaWidth = Math.min(Math.max(200, width * 0.2), 300);

  return (
    <div
      className="MultiscaleTimeSeriesView"
      style={{ position: "absolute", width, height, overflow: "hidden" }}
    >
      <div
        className="MultiscaleTimeSeriesViewTopBar"
        style={{
          position: "absolute",
          width: leftAreaWidth,
          height,
          overflow: "hidden",
        }}
      >
        <LeftArea
          width={leftAreaWidth}
          height={height}
          job={job}
          incompleteJob={incompleteJob}
          onRefreshJob={refreshAllJobs}
          submitJob={submitJob}
        />
        <hr />
      </div>
      <div
        className="AviPageContent"
        style={{
          position: "absolute",
          left: leftAreaWidth,
          width: width - leftAreaWidth,
          height,
          overflow: "hidden",
        }}
      >
        {dsUrl && <div>Test</div>}
      </div>
    </div>
  );
};

const useDsUrlForNwbUrl = (
  nwbUrl: string,
): {
  dsUrl: string | undefined;
  job: DendroJob | undefined | null; // undefined means loading, null means not found
  incompleteJob: DendroJob | undefined | null; // undefined means loading, null means not found (or not relevant)
  refreshAllJobs: () => void;
  submitJob: (dendroApiKey: string) => void;
} => {
  const tags = useMemo(() => ["neurosift", "ts_downsample_for_vis"], []);
  const { allJobs, refreshAllJobs } = useAllJobs({
    tags,
    inputFileUrl: nwbUrl,
  });
  const { job, incompleteJob } = useMemo(() => {
    if (!allJobs) return { job: undefined, incompleteJob: undefined };
    // find the job with the most recent creation time
    const jobsWithCreationTimes: { job: DendroJob; creationTime: number }[] =
      allJobs.map((j) => {
        return { job: j, creationTime: j.timestampCreatedSec };
      });
    // sort jobs by creation time in descending order
    const sortedJobsWithCreationTimes = jobsWithCreationTimes.sort(
      (a, b) => b.creationTime - a.creationTime,
    );

    // job is the most recent job that is completed
    // incompleteJob is the most recent job that is not completed, as long as it has a completion time later than job
    let job: DendroJob | null = null;
    let incompleteJob: DendroJob | null = null;
    for (const j of sortedJobsWithCreationTimes) {
      if (j.job.status === "completed") {
        job = j.job;
        break;
      } else {
        if (!job) {
          incompleteJob = j.job;
        }
      }
    }
    return { job, incompleteJob };
  }, [allJobs]);
  const dsUrl = useMemo(() => {
    if (!job) return undefined;
    if (job.status !== "completed") return undefined;
    const oo = job.outputFileResults.find((o) => o.name === "output");
    if (!oo) return undefined;
    return oo.url;
  }, [job]);
  let inputFileBaseName = "input.nwb";
  if (nwbUrl.endsWith(".lindi.json")) {
    inputFileBaseName = "input.lindi.json";
  } else if (nwbUrl.endsWith(".lindi.tar")) {
    inputFileBaseName = "input.lindi.tar";
  }
  const submitJob = useCallback(
    async (dendroApiKey: string) => {
      const jobDefinition: DendroJobDefinition = {
        appName: "hello_neurosift",
        processorName: "ts_downsample_for_vis",
        inputFiles: [
          {
            name: "input",
            fileBaseName: inputFileBaseName,
            url: nwbUrl,
          },
        ],
        outputFiles: [
          {
            name: "output",
            fileBaseName: "output.lindi.tar",
          },
        ],
        parameters: [],
      };
      const requiredResources: DendroJobRequiredResources = {
        numCpus: 1,
        numGpus: 0,
        memoryGb: 4,
        timeSec: 60 * 60 * 2,
      };
      const serviceName = "hello_world_service";
      const secrets = createDendroJobSecrets({ staging: isStagingUrl(nwbUrl) });
      const req: CreateJobRequest = {
        type: "createJobRequest",
        serviceName,
        userId: "",
        batchId: "",
        tags,
        jobDefinition,
        requiredResources,
        secrets,
        jobDependencies: [],
        skipCache: false,
        rerunFailing: true,
        deleteFailing: true,
      };
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${dendroApiKey}`,
      };
      const resp = await fetch(`https://dendro.vercel.app/api/createJob`, {
        method: "POST",
        headers,
        body: JSON.stringify(req),
      });
      if (!resp.ok) {
        throw Error(`Error creating job: ${resp.statusText}`);
      }
      const rr = await resp.json();
      if (!isCreateJobResponse(rr)) {
        throw Error(`Unexpected response: ${JSON.stringify(rr)}`);
      }
      refreshAllJobs();
    },
    [nwbUrl, refreshAllJobs, tags, inputFileBaseName],
  );
  return { dsUrl, job, incompleteJob, refreshAllJobs, submitJob };
};

type LeftAreaProps = {
  width: number;
  height: number;
  job: DendroJob | undefined | null; // undefined means loading, null means not found
  incompleteJob: DendroJob | undefined | null; // undefined means loading, null means not found (or not relevant)
  onRefreshJob: () => void;
  submitJob: (dendroApiKey: string) => void;
};

const LeftArea: FunctionComponent<LeftAreaProps> = ({
  job,
  incompleteJob,
  onRefreshJob,
  submitJob,
}) => {
  const [submittingNewJob, setSubmittingNewJob] = useState(false);
  const [dendroApiKey, setDendroApiKey] = useState("");
  return (
    <div>
      {job && (
        <div style={{ padding: 3 }}>
          <JobInfoView
            job={job}
            onRefreshJob={onRefreshJob}
            parameterNames={[]}
          />
        </div>
      )}
      {!submittingNewJob && job !== undefined && (
        <div style={{ padding: 3 }}>
          <button onClick={() => setSubmittingNewJob(true)}>
            Submit new job
          </button>
        </div>
      )}
      {submittingNewJob && (
        <div>
          <SelectDendroApiKeyComponent
            value={dendroApiKey}
            setValue={setDendroApiKey}
          />
        </div>
      )}
      {submittingNewJob && (
        <button
          onClick={() => {
            submitJob(dendroApiKey);
            setSubmittingNewJob(false);
          }}
        >
          Submit
        </button>
      )}
      <hr />
      {incompleteJob && (
        <div style={{ padding: 3 }}>
          <p>Incomplete job:</p>
          <JobInfoView
            job={incompleteJob}
            onRefreshJob={onRefreshJob}
            parameterNames={[]}
          />
        </div>
      )}
    </div>
  );
};

export default MultiscaleTimeSeriesView;
