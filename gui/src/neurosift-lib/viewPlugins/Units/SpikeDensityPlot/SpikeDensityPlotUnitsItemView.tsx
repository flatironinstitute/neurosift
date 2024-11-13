/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {
  CreateJobRequest,
  DendroJob,
  DendroJobDefinition,
  DendroJobRequiredResources,
  isCreateJobResponse,
} from "../../../misc/dendro/dendro-types";
import {
  FunctionComponent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNwbFile } from "../../../misc/NwbFileContext";
import {
  SelectDendroApiKeyComponent,
  useAllJobs,
} from "../../CEBRA/DendroHelpers";
import {
  createDendroJobSecrets,
  isStagingUrl,
} from "../../ElectricalSeriesItemView/SpikeSortingView/SpikeSortingView";
import { JobInfoView } from "../../CEBRA/DendroItemView";
import SpikeDensityPlotWidget from "./SpikeDensityPlotWidget";
import { RemoteH5FileX } from "../../../remote-h5-file/index";

type Props = {
  width: number;
  height: number;
  path: string;
  condensed?: boolean;
};

const SpikeDensityPlotUnitsItemView: FunctionComponent<Props> = ({
  width,
  height,
  path,
}) => {
  const nwbFile = useNwbFile();
  if (!nwbFile) throw Error("Unexpected: nwbFile is null");

  const nwbUrl = useMemo(() => {
    return (nwbFile.sourceUrls || [])[0];
  }, [nwbFile]);

  const {
    outputUrl: multiscaleSpikeDensityOutputUrl,
    job: multiscaleSpikeDensityJob,
    incompleteJob: incompleteMultiscaleSpikeDensityJob,
    refreshAllJobs: refreshAllMultiscaleSpikeDensityJobs,
    submitJob: submitMultiscaleSpikeDensityJob,
  } = useMultiscaleSpikeDensityJob(nwbUrl, path);

  const {
    output: rastermapOutput,
    job: rastermapJob,
    incompleteJob: incompleteRastermapJob,
    refreshAllJobs: refreshAllRastermapJobs,
    submitJob: submitRastermapJob,
  } = useRastermapJob(nwbUrl, path);

  const jobPanelWidth = Math.min(Math.max(200, width * 0.2), 300);

  const [useRastermapOrder, setUseRastermapOrder] = useState(false);

  const numUnits = useNumUnits(nwbFile, path);
  if (numUnits === undefined) {
    return <div>Getting number of units...</div>;
  }

  return (
    <div
      className="SpikeDensityPlotUnitsItemView"
      style={{ position: "absolute", width, height, overflow: "hidden" }}
    >
      <div
        className="SpikeDensityPlotUnitsItemViewJobPanel"
        style={{
          position: "absolute",
          width: jobPanelWidth,
          height,
          overflow: "hidden",
        }}
      >
        <JobPanel
          width={jobPanelWidth}
          height={height}
          multiscaleSpikeDensityJob={multiscaleSpikeDensityJob || null}
          incompleteMultiscaleSpikeDensityJob={
            incompleteMultiscaleSpikeDensityJob || null
          }
          onRefreshMultiscaleSpikeDensityJob={
            refreshAllMultiscaleSpikeDensityJobs
          }
          submitMultiscaleSpikeDensityJob={submitMultiscaleSpikeDensityJob}
          rastermapJob={rastermapJob || null}
          incompleteRastermapJob={incompleteRastermapJob || null}
          onRefreshRastermapJob={refreshAllRastermapJobs}
          submitRastermapJob={submitRastermapJob}
          numUnits={numUnits}
          useRastermapOrder={useRastermapOrder}
          setUseRastermapOrder={setUseRastermapOrder}
        />
        <hr />
      </div>
      <div
        className="SpikeDensityPlotUnitsItemViewContent"
        style={{
          position: "absolute",
          left: jobPanelWidth,
          width: width - jobPanelWidth,
          height,
          overflow: "hidden",
        }}
      >
        {multiscaleSpikeDensityJob &&
        multiscaleSpikeDensityJob.status === "completed" &&
        multiscaleSpikeDensityOutputUrl ? (
          <SpikeDensityPlotWidget
            width={width - jobPanelWidth}
            height={height}
            multiscaleSpikeDensityOutputUrl={multiscaleSpikeDensityOutputUrl}
            rastermapOutput={useRastermapOrder ? rastermapOutput : undefined}
          />
        ) : multiscaleSpikeDensityJob &&
          multiscaleSpikeDensityJob.status != "completed" ? (
          <div>Job status: {multiscaleSpikeDensityJob.status}</div>
        ) : (
          <div>You must submit a job</div>
        )}
      </div>
    </div>
  );
};

const useMultiscaleSpikeDensityJob = (nwbUrl: string, unitsPath: string) => {
  const tags = useMemo(() => ["neurosift", "multiscale_spike_density"], []);
  const { allJobs, refreshAllJobs } = useAllJobs({
    tags,
    inputFileUrl: nwbUrl,
    appName: "hello_neurosift",
    processorName: "multiscale_spike_density",
  });
  const { job, incompleteJob } = useMemo(() => {
    if (!allJobs) return { job: undefined, incompleteJob: undefined };

    const allJobs2 = allJobs.filter((j) => {
      const aa = j.jobDefinition.parameters.find(
        (p) => p.name === "units_path",
      );
      if (!aa) return false;
      return aa.value === unitsPath;
    });

    // find the job with the most recent creation time
    const jobsWithCreationTimes: { job: DendroJob; creationTime: number }[] =
      allJobs2.map((j) => {
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
  }, [allJobs, unitsPath]);
  const outputUrl = useMemo(() => {
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
    async (dendroApiKey: string, binSizeMsec: number) => {
      const jobDefinition: DendroJobDefinition = {
        appName: "hello_neurosift",
        processorName: "multiscale_spike_density",
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
        parameters: [
          {
            name: "units_path",
            value: unitsPath,
          },
          {
            name: "bin_size_msec",
            value: binSizeMsec,
          },
        ],
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
    [nwbUrl, refreshAllJobs, tags, inputFileBaseName, unitsPath],
  );
  return { outputUrl, job, incompleteJob, refreshAllJobs, submitJob };
};

const useRastermapJob = (nwbUrl: string, unitsPath: string) => {
  const tags = useMemo(() => ["neurosift", "rasteramp"], []);
  const { allJobs, refreshAllJobs } = useAllJobs({
    tags,
    inputFileUrl: nwbUrl,
    appName: "hello_rastermap",
    processorName: "rastermap",
  });
  const { job, incompleteJob } = useMemo(() => {
    if (!allJobs) return { job: undefined, incompleteJob: undefined };

    const allJobs2 = allJobs.filter((j) => {
      const aa = j.jobDefinition.parameters.find(
        (p) => p.name === "units_path",
      );
      if (!aa) return false;
      return aa.value === unitsPath;
    });

    // find the job with the most recent creation time
    const jobsWithCreationTimes: { job: DendroJob; creationTime: number }[] =
      allJobs2.map((j) => {
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
  }, [allJobs, unitsPath]);
  const outputUrl = useMemo(() => {
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
    async (
      dendroApiKey: string,
      params: {
        n_clusters: number;
        n_PCs: number;
        locality: number;
        grid_upsample: number;
      },
    ) => {
      const { n_clusters, n_PCs, locality, grid_upsample } = params;
      const jobDefinition: DendroJobDefinition = {
        appName: "hello_rastermap",
        processorName: "rastermap",
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
            fileBaseName: "output.json",
          },
        ],
        parameters: [
          {
            name: "units_path",
            value: unitsPath,
          },
          {
            name: "n_clusters",
            value: n_clusters,
          },
          {
            name: "n_PCs",
            value: n_PCs,
          },
          {
            name: "locality",
            value: locality,
          },
          {
            name: "grid_upsample",
            value: grid_upsample,
          },
        ],
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
    [nwbUrl, refreshAllJobs, tags, inputFileBaseName, unitsPath],
  );
  const [output, setOutput] = useState<any>(null);
  useEffect(() => {
    if (!outputUrl) return;
    (async () => {
      const resp = await fetch(outputUrl);
      if (!resp.ok) {
        throw Error(`Error fetching output file: ${resp.statusText}`);
      }
      const oo = await resp.json();
      setOutput(oo);
    })();
  }, [outputUrl]);
  return { output, job, incompleteJob, refreshAllJobs, submitJob };
};

type JobPanelProps = {
  width: number;
  height: number;
  multiscaleSpikeDensityJob: DendroJob | null;
  incompleteMultiscaleSpikeDensityJob: DendroJob | null;
  onRefreshMultiscaleSpikeDensityJob: () => void;
  submitMultiscaleSpikeDensityJob: (
    dendroApiKey: string,
    durationSec: number,
  ) => void;

  rastermapJob: DendroJob | null;
  incompleteRastermapJob: DendroJob | null;
  onRefreshRastermapJob: () => void;
  submitRastermapJob: (
    dendroApiKey: string,
    params: {
      n_clusters: number;
      n_PCs: number;
      locality: number;
      grid_upsample: number;
    },
  ) => void;

  numUnits: number;

  useRastermapOrder: boolean;
  setUseRastermapOrder: (val: boolean) => void;
};

const JobPanel: FunctionComponent<JobPanelProps> = ({
  multiscaleSpikeDensityJob,
  incompleteMultiscaleSpikeDensityJob,
  onRefreshMultiscaleSpikeDensityJob,
  submitMultiscaleSpikeDensityJob,

  rastermapJob,
  incompleteRastermapJob,
  onRefreshRastermapJob,
  submitRastermapJob,

  numUnits,

  useRastermapOrder,
  setUseRastermapOrder,
}) => {
  const [
    submittingNewMultiscaleSpikeDensityJob,
    setSubmittingNewMultiscaleSpikeDensityJob,
  ] = useState(false);
  const [submittingNewRastermapJob, setSubmittingNewRastermapJob] =
    useState(false);
  const [dendroApiKey, setDendroApiKey] = useState("");
  return (
    <div>
      <h3>Spike density matrix</h3>
      {multiscaleSpikeDensityJob && (
        <div style={{ padding: 3 }}>
          <JobInfoView
            job={multiscaleSpikeDensityJob}
            onRefreshJob={onRefreshMultiscaleSpikeDensityJob}
            parameterNames={[]}
          />
        </div>
      )}
      {!submittingNewMultiscaleSpikeDensityJob &&
        multiscaleSpikeDensityJob !== undefined && (
          <div style={{ padding: 3 }}>
            <button
              onClick={() => setSubmittingNewMultiscaleSpikeDensityJob(true)}
            >
              Submit new job
            </button>
          </div>
        )}
      {submittingNewMultiscaleSpikeDensityJob && (
        <div>
          <SelectDendroApiKeyComponent
            value={dendroApiKey}
            setValue={setDendroApiKey}
          />
        </div>
      )}
      {submittingNewMultiscaleSpikeDensityJob && (
        <button
          onClick={() => {
            submitMultiscaleSpikeDensityJob(dendroApiKey, 20);
            setSubmittingNewMultiscaleSpikeDensityJob(false);
          }}
        >
          Submit
        </button>
      )}
      <hr />
      {incompleteMultiscaleSpikeDensityJob && (
        <div style={{ padding: 3 }}>
          <p>Incomplete job:</p>
          <JobInfoView
            job={incompleteMultiscaleSpikeDensityJob}
            onRefreshJob={onRefreshMultiscaleSpikeDensityJob}
            parameterNames={[]}
          />
        </div>
      )}
      <hr />
      <h3>Rastermap</h3>
      {rastermapJob && (
        <div style={{ padding: 3 }}>
          <JobInfoView
            job={rastermapJob}
            onRefreshJob={onRefreshRastermapJob}
            parameterNames={[
              "n_clusters",
              "n_PCs",
              "locality",
              "grid_upsample",
            ]}
          />
        </div>
      )}
      {!submittingNewRastermapJob && rastermapJob !== undefined && (
        <div style={{ padding: 3 }}>
          <button
            onClick={() => {
              setSubmittingNewRastermapJob(true);
            }}
          >
            Submit new job
          </button>
        </div>
      )}
      {submittingNewRastermapJob && (
        <div>
          <SelectDendroApiKeyComponent
            value={dendroApiKey}
            setValue={setDendroApiKey}
          />
        </div>
      )}
      {submittingNewRastermapJob && (
        <button
          onClick={() => {
            submitRastermapJob(dendroApiKey, {
              n_clusters: numUnits < 100 ? 0 : 100,
              n_PCs: numUnits < 64 ? numUnits : 64,
              locality: 0.1,
              grid_upsample: 0,
            });
            setSubmittingNewRastermapJob(false);
          }}
        >
          Submit
        </button>
      )}
      {incompleteRastermapJob && (
        <div style={{ padding: 3 }}>
          <p>Incomplete job:</p>
          <JobInfoView
            job={incompleteRastermapJob}
            onRefreshJob={onRefreshRastermapJob}
            parameterNames={[
              "n_clusters",
              "n_PCs",
              "locality",
              "grid_upsample",
            ]}
          />
        </div>
      )}
      {rastermapJob && rastermapJob.status === "completed" && (
        <div>
          <input
            type="checkbox"
            checked={useRastermapOrder}
            onChange={(e) => setUseRastermapOrder(e.target.checked)}
          />{" "}
          Use rastermap order
        </div>
      )}
      <div>&nbsp;</div>
      <div>
        <a
          href="https://www.nature.com/articles/s41593-024-01783-4"
          target="_blank"
          rel="noreferrer"
        >
          Rastermap paper
        </a>
      </div>
    </div>
  );
};

const useNumUnits = (nwbFile: RemoteH5FileX, unitsPath: string) => {
  const [numUnits, setNumUnits] = useState<number | undefined>(undefined);
  useEffect(() => {
    let canceled = false;
    (async () => {
      const unitsDataset = await nwbFile.getDataset(`${unitsPath}/id`);
      if (canceled) return;
      if (!unitsDataset) {
        console.warn(`Unable to get units dataset: ${unitsPath}/id`);
        return;
      }
      const numUnits = unitsDataset.shape[0];
      setNumUnits(numUnits);
    })();
    return () => {
      canceled = true;
    };
  }, [nwbFile, unitsPath]);
  return numUnits;
};

export default SpikeDensityPlotUnitsItemView;
