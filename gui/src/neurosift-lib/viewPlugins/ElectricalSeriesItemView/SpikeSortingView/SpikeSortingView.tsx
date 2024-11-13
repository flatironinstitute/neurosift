import { Hyperlink, SmallIconButton } from "@fi-sci/misc";
import {
  KeyboardArrowDown,
  KeyboardArrowRight,
  OpenInNew,
  Refresh,
} from "@mui/icons-material";
import { Button } from "@mui/material";
import {
  CreateJobRequest,
  DendroJob,
  DendroJobDefinition,
  DendroJobParameter,
  DendroJobRequiredResources,
  isCreateJobResponse,
} from "../../../misc/dendro/dendro-types";
import { timeAgoString } from "../../../utils/timeStrings";
import useRoute from "../../../contexts/useRoute";
import {
  FunctionComponent,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from "react";
import { useNwbFile } from "../../../misc/NwbFileContext";
import {
  SelectDendroApiKeyComponent,
  SelectDendroComputeClientIdComponent,
  getJobOutputUrl,
  useAllJobs,
  useDendroApiKey,
  useJob,
} from "../../CEBRA/DendroHelpers";
import { JobInfoView } from "../../CEBRA/DendroItemView";
import useTimeSeriesInfo from "../../TimeSeries/useTimeseriesInfo";
import InputChoices from "./InputChoices";
import {
  SelectSpikeSortingKilosort4Opts,
  SpikeSortingKilosort4Opts,
  defaultSpikeSortingKilosort4Opts,
} from "./kilosort4";
import {
  SelectSpikeSortingMountainSort5Opts,
  SpikeSortingMountainSort5Opts,
  defaultSpikeSortingMountainSort5Opts,
} from "./mountainsort5";
import ElectrodeGeometryView from "../../Ephys/ElectrodeGeometryView";
import { Expandable } from "../../Ephys/EphysSummaryItemView";

type SpikeSortingViewProps = {
  width: number;
  height: number;
  path: string;
};

const serviceName = "hello_world_service";
const title = "Spike Sorting (under construction - do not use!)";

const tagsBase = ["neurosift", "spike_sorting"];
const tagsPrepareEphys = [...tagsBase, "prepare_ephys"];
const tagsSpikeSorting = [...tagsBase, "spike_sort"];
const tagsSpikeSortingMountainSort5 = [...tagsSpikeSorting, "mountainsort5"];
const tagsSpikeSortingKilosort4 = [...tagsSpikeSorting, "kilosort4"];
const tagsPostProcessing = [...tagsBase, "post_processing"];

type PrepareEphysOpts = {
  duration_sec: number; // 0 means full duration
  electrode_indices: number[];
  freq_min: number;
  freq_max: number;
  compression_ratio: number;
  output_electrical_series_name: string;
};

const defaultPrepareEphysOpts: PrepareEphysOpts = {
  duration_sec: 60,
  electrode_indices: [0],
  freq_min: 300,
  freq_max: 6000,
  compression_ratio: 12,
  output_electrical_series_name: "",
};

type PostProcessingOpts = {
  // none
};

const defaultPostProcessingOpts: PostProcessingOpts = {
  // none
};

const SpikeSortingView: FunctionComponent<SpikeSortingViewProps> = ({
  width,
  height,
  path,
}) => {
  const nwbFile = useNwbFile();
  if (!nwbFile)
    throw Error("Unexpected: nwbFile is undefined (no context provider)");

  const nwbUrl = useMemo(() => {
    return (nwbFile.sourceUrls || [])[0];
  }, [nwbFile]);

  const { samplingRate } = useTimeSeriesInfo(nwbFile, path);

  const { allJobs, refreshAllJobs } = useAllSpikeSortingJobs(nwbUrl);

  const [selectedJobId, setSelectedJobId] = useState<string | undefined>(
    undefined,
  );

  const selectedJob = useMemo(() => {
    if (!selectedJobId) return undefined;
    return allJobs?.find((j) => j.jobId === selectedJobId);
  }, [selectedJobId, allJobs]);

  if (samplingRate === undefined) {
    return <div>Loading...</div>;
  }
  if (samplingRate === null) {
    return <div>Unable to determing sampling rate</div>;
  }
  if (samplingRate < 10000) {
    return (
      <div>
        <p>
          The sampling rate of the electrical series is too low to run spike
          sorting.
        </p>
        <p>Sampling rate: {samplingRate} Hz</p>
      </div>
    );
  }

  return (
    <div style={{ position: "absolute", width, height, overflowY: "auto" }}>
      <div style={{ padding: 10 }}>
        <h3>{title}</h3>
        <hr />
        <Expandable title="Electrode geometry" defaultExpanded={false}>
          <ElectrodeGeometryView
            width={width - 20}
            height={500}
            nwbFile={nwbFile}
            electricalSeriesPath={path}
          />
        </Expandable>
        <hr />
        <AllJobsTree
          allJobs={allJobs || undefined}
          refreshAllJobs={refreshAllJobs}
          selectedJobId={selectedJobId}
          setSelectedJobId={setSelectedJobId}
        />
        <CreatePrepareEphysJobComponent
          nwbUrl={nwbUrl}
          path={path}
          onNewJobId={(jobId) => {
            refreshAllJobs();
            setSelectedJobId(jobId);
          }}
        />
        <hr />
        {selectedJobId &&
          selectedJob &&
          (selectedJob.tags.includes("prepare_ephys") ? (
            <PrepareEphysJobView
              jobId={selectedJobId}
              nwbUrl={nwbUrl}
              onNewJobId={setSelectedJobId}
            />
          ) : selectedJob.tags.includes("spike_sort") ? (
            <SpikeSortJobView
              jobId={selectedJobId}
              nwbUrl={nwbUrl}
              onNewJobId={setSelectedJobId}
            />
          ) : selectedJob.tags.includes("post_processing") ? (
            <PostProcessingJobView jobId={selectedJobId} />
          ) : (
            <div>Unexpected job type: {selectedJob.tags.join(", ")}</div>
          ))}
        <hr />
      </div>
    </div>
  );
};

type CreatePrepareEphysJobComponentProps = {
  nwbUrl: string;
  path: string;
  onNewJobId: (jobId: string) => void;
};

const CreatePrepareEphysJobComponent: FunctionComponent<
  CreatePrepareEphysJobComponentProps
> = ({ nwbUrl, path, onNewJobId }) => {
  const [prepareEphysOpts, setPrepareEphysOpts] = useState<PrepareEphysOpts>(
    defaultPrepareEphysOpts,
  );
  useEffect(() => {
    if (!prepareEphysOpts.output_electrical_series_name) {
      const name = path.split("/").slice(-1)[0];
      setPrepareEphysOpts((o) => ({
        ...o,
        output_electrical_series_name: name + "_pre",
      }));
    }
  }, [path, prepareEphysOpts.output_electrical_series_name]);
  const prepareEphysJobParameters: DendroJobParameter[] = useMemo(() => {
    return [
      { name: "electrical_series_path", value: path },
      { name: "duration_sec", value: prepareEphysOpts.duration_sec },
      {
        name: "electrode_indices",
        value: prepareEphysOpts.electrode_indices,
      },
      { name: "freq_min", value: prepareEphysOpts.freq_min },
      { name: "freq_max", value: prepareEphysOpts.freq_max },
      {
        name: "compression_ratio",
        value: prepareEphysOpts.compression_ratio,
      },
      {
        name: "output_electrical_series_name",
        value: prepareEphysOpts.output_electrical_series_name,
      },
    ];
  }, [prepareEphysOpts, path]);

  const prepareEphysJobRequiredResources: DendroJobRequiredResources =
    useMemo(() => {
      return {
        numCpus: 4,
        numGpus: 0,
        memoryGb: 4,
        timeSec: 60 * 60 * 3,
      };
    }, []);

  const prepareEphysJobDefinition: DendroJobDefinition = useMemo(() => {
    return {
      appName: "hello_neurosift",
      processorName: "prepare_ephys_spike_sorting_dataset",
      inputFiles: [
        {
          name: "input",
          fileBaseName: nwbUrl.endsWith(".lindi.json")
            ? "input.lindi.json"
            : nwbUrl.endsWith(".lindi.tar")
              ? "input.lindi.tar"
              : "input.nwb",
          url: nwbUrl,
        },
      ],
      outputFiles: [
        {
          name: "output",
          fileBaseName: "pre.nwb.lindi.tar",
        },
      ],
      parameters: prepareEphysJobParameters,
    };
  }, [nwbUrl, prepareEphysJobParameters]);

  const tagsPrepareEphys_2 = useMemo(
    () => [...tagsPrepareEphys, `nwb:${nwbUrl}`],
    [nwbUrl],
  );
  const jobDependencies = useMemo(() => [], []);

  const selectPrepareEphysOptsComponent = (
    <SelectPrepareEphysOpts
      prepareEphysOpts={prepareEphysOpts}
      setPrepareEphysOpts={setPrepareEphysOpts}
    />
  );
  return (
    <CreateJobComponent
      buttonLabel="Prepare new dataset"
      selectOptsComponent={selectPrepareEphysOptsComponent}
      jobDefinition={prepareEphysJobDefinition}
      requiredResources={prepareEphysJobRequiredResources}
      tags={tagsPrepareEphys_2}
      jobDependencies={jobDependencies}
      onNewJobId={onNewJobId}
      staging={isStagingUrl(nwbUrl)}
    />
  );
};

export const isStagingUrl = (url: string): boolean => {
  if (url.startsWith("https://api-staging.dandiarchive.org/")) {
    return true;
  }
  return false;
};

type CreateSpikeSortJobComponentProps = {
  nwbUrl: string;
  onNewJobId: (jobId: string) => void;
  parentJob: DendroJob;
};

const CreateSpikeSortJobComponent: FunctionComponent<
  CreateSpikeSortJobComponentProps
> = ({ nwbUrl, onNewJobId, parentJob }) => {
  return (
    <div>
      <CreateMountainSort5JobComponent
        nwbUrl={nwbUrl}
        onNewJobId={onNewJobId}
        prepareEphysJob={parentJob}
      />
      <CreateKilosort4JobComponent
        nwbUrl={nwbUrl}
        onNewJobId={onNewJobId}
        prepareEphysJob={parentJob}
      />
    </div>
  );
};

type CreateMountainSort5JobComponentProps = {
  nwbUrl: string;
  onNewJobId: (jobId: string) => void;
  prepareEphysJob: DendroJob;
};

const CreateMountainSort5JobComponent: FunctionComponent<
  CreateMountainSort5JobComponentProps
> = ({ nwbUrl, onNewJobId, prepareEphysJob }) => {
  const [opts, setOpts] = useState<SpikeSortingMountainSort5Opts>(
    defaultSpikeSortingMountainSort5Opts,
  );

  const requiredResources: DendroJobRequiredResources = useMemo(() => {
    return {
      numCpus: 4,
      numGpus: 0,
      memoryGb: 4,
      timeSec: 60 * 60 * 3,
    };
  }, []);

  const prepareEphysOutputElectricalSeriesPath = useMemo(() => {
    if (!prepareEphysJob) {
      return undefined;
    }
    const pp = prepareEphysJob.jobDefinition.parameters.find(
      (p) => p.name === "output_electrical_series_name",
    );
    if (!pp) {
      return undefined;
    }
    return `acquisition/${pp.value as string}`;
  }, [prepareEphysJob]);

  const jobDefinition: DendroJobDefinition | undefined = useMemo(() => {
    const inputFileUrl = getJobOutputUrl(prepareEphysJob, "output");
    if (!inputFileUrl) {
      return undefined;
    }
    if (!prepareEphysOutputElectricalSeriesPath) {
      return undefined;
    }
    return {
      appName: "hello_neurosift",
      processorName: "mountainsort5",
      inputFiles: [
        {
          name: "input",
          fileBaseName: "input.nwb.lindi.tar",
          url: inputFileUrl,
        },
      ],
      outputFiles: [
        {
          name: "output",
          fileBaseName: "output.nwb.lindi.tar",
        },
      ],
      parameters: [
        {
          name: "electrical_series_path",
          value: prepareEphysOutputElectricalSeriesPath,
        },
        {
          name: "output_units_name",
          value: opts.output_units_name,
        },
        {
          name: "detect_threshold",
          value: opts.detect_threshold,
        },
        {
          name: "channel_radius",
          value: opts.channel_radius,
        },
      ],
    };
  }, [prepareEphysJob, opts, prepareEphysOutputElectricalSeriesPath]);

  const tagsMountainSort5_2 = useMemo(
    () => [...tagsSpikeSortingMountainSort5, `nwb:${nwbUrl}`],
    [nwbUrl],
  );
  const jobDependencies = useMemo(
    () => [prepareEphysJob.jobId],
    [prepareEphysJob],
  );

  const selectOptsComponent = (
    <SelectSpikeSortingMountainSort5Opts
      spikeSortingOpts={opts}
      setSpikeSortingOpts={setOpts}
    />
  );

  if (!jobDefinition) {
    return <div>No job definition</div>;
  }
  return (
    <CreateJobComponent
      buttonLabel="Run MountainSort5"
      selectOptsComponent={selectOptsComponent}
      jobDefinition={jobDefinition}
      requiredResources={requiredResources}
      tags={tagsMountainSort5_2}
      jobDependencies={jobDependencies}
      onNewJobId={onNewJobId}
      staging={isStagingUrl(nwbUrl)}
    />
  );
};

type CreateKilosort4JobComponentProps = {
  nwbUrl: string;
  onNewJobId: (jobId: string) => void;
  prepareEphysJob: DendroJob;
};

const CreateKilosort4JobComponent: FunctionComponent<
  CreateKilosort4JobComponentProps
> = ({ nwbUrl, onNewJobId, prepareEphysJob }) => {
  const [opts, setOpts] = useState<SpikeSortingKilosort4Opts>(
    defaultSpikeSortingKilosort4Opts,
  );

  const requiredResources: DendroJobRequiredResources = useMemo(() => {
    return {
      numCpus: 4,
      numGpus: 1,
      memoryGb: 16,
      timeSec: 60 * 60 * 3,
    };
  }, []);

  const prepareEphysOutputElectricalSeriesPath = useMemo(() => {
    if (!prepareEphysJob) {
      return undefined;
    }
    const pp = prepareEphysJob.jobDefinition.parameters.find(
      (p) => p.name === "output_electrical_series_name",
    );
    if (!pp) {
      return undefined;
    }
    return `acquisition/${pp.value as string}`;
  }, [prepareEphysJob]);

  const jobDefinition: DendroJobDefinition | undefined = useMemo(() => {
    const inputFileUrl = getJobOutputUrl(prepareEphysJob, "output");
    if (!inputFileUrl) {
      return undefined;
    }
    if (!prepareEphysOutputElectricalSeriesPath) {
      return undefined;
    }
    return {
      appName: "hello_kilosort4",
      processorName: "kilosort4",
      inputFiles: [
        {
          name: "input",
          fileBaseName: "input.nwb.lindi.tar",
          url: inputFileUrl,
        },
      ],
      outputFiles: [
        {
          name: "output",
          fileBaseName: "output.nwb.lindi.tar",
        },
      ],
      parameters: [
        {
          name: "electrical_series_path",
          value: prepareEphysOutputElectricalSeriesPath,
        },
        {
          name: "output_units_name",
          value: opts.output_units_name,
        },
      ],
    };
  }, [prepareEphysJob, prepareEphysOutputElectricalSeriesPath, opts]);

  const tagsKilosort4_2 = useMemo(
    () => [...tagsSpikeSortingKilosort4, `nwb:${nwbUrl}`],
    [nwbUrl],
  );
  const jobDependencies = useMemo(
    () => [prepareEphysJob.jobId],
    [prepareEphysJob],
  );

  const selectOptsComponent = (
    <SelectSpikeSortingKilosort4Opts
      spikeSortingOpts={opts}
      setSpikeSortingOpts={setOpts}
    />
  );

  if (!jobDefinition) {
    return <div>No job definition</div>;
  }
  return (
    <CreateJobComponent
      buttonLabel="Run Kilosort4"
      selectOptsComponent={selectOptsComponent}
      jobDefinition={jobDefinition}
      requiredResources={requiredResources}
      tags={tagsKilosort4_2}
      jobDependencies={jobDependencies}
      onNewJobId={onNewJobId}
      staging={isStagingUrl(nwbUrl)}
    />
  );
};

type CreatePostProcessingJobComponentProps = {
  nwbUrl: string;
  onNewJobId: (jobId: string) => void;
  spikeSortingJob: DendroJob;
};

const CreatePostProcessingJobComponent: FunctionComponent<
  CreatePostProcessingJobComponentProps
> = ({ nwbUrl, onNewJobId, spikeSortingJob }) => {
  const [opts, setOpts] = useState<PostProcessingOpts>(
    defaultPostProcessingOpts,
  );

  const requiredResources: DendroJobRequiredResources = useMemo(() => {
    return {
      numCpus: 4,
      numGpus: 0,
      memoryGb: 4,
      timeSec: 60 * 60 * 4,
    };
  }, []);

  const jobDefinition: DendroJobDefinition | undefined = useMemo(() => {
    if (!spikeSortingJob) {
      return undefined;
    }
    const inputFileUrl = getJobOutputUrl(spikeSortingJob, "output");
    if (!inputFileUrl) {
      return undefined;
    }
    return {
      appName: "hello_neurosift",
      processorName: "spike_sorting_post_processing",
      inputFiles: [
        {
          name: "input",
          fileBaseName: "input.nwb.lindi.tar",
          url: inputFileUrl,
        },
      ],
      outputFiles: [
        {
          name: "output",
          fileBaseName: "post.nwb.lindi.tar",
        },
      ],
      parameters: [
        {
          name: "electrical_series_path",
          value: getInputParameterValue(
            spikeSortingJob,
            "electrical_series_path",
          ),
        },
        {
          name: "units_path",
          value:
            "processing/ecephys/" +
            getInputParameterValue(spikeSortingJob, "output_units_name"),
        },
      ],
    };
  }, [spikeSortingJob]);

  const tagsPostProcessing_2 = useMemo(
    () => [...tagsPostProcessing, `nwb:${nwbUrl}`],
    [nwbUrl],
  );
  const jobDependencies = useMemo(
    () => [spikeSortingJob.jobId],
    [spikeSortingJob],
  );

  const selectOptsComponent = (
    <SelectPostProcessingOpts
      postProcessingOpts={opts}
      setPostProcessingOpts={setOpts}
    />
  );

  if (!jobDefinition) {
    return <div>No job definition</div>;
  }
  return (
    <CreateJobComponent
      buttonLabel="Run post-processing"
      selectOptsComponent={selectOptsComponent}
      jobDefinition={jobDefinition}
      requiredResources={requiredResources}
      tags={tagsPostProcessing_2}
      jobDependencies={jobDependencies}
      onNewJobId={onNewJobId}
      staging={isStagingUrl(nwbUrl)}
    />
  );
};

export const createDendroJobSecrets = (o: {
  staging: boolean;
}): { name: string; value: string }[] => {
  const { staging } = o;
  const secrets: { name: string; value: string }[] = [];
  const dandiApiKey = staging
    ? localStorage.getItem("dandiStagingApiKey") || ""
    : localStorage.getItem("dandiApiKey") || "";
  if (dandiApiKey) {
    secrets.push({ name: "DANDI_API_KEY", value: dandiApiKey });
  }
  return secrets;
};

type CreateJobComponentProps = {
  buttonLabel: string;
  selectOptsComponent: any;
  jobDefinition: DendroJobDefinition;
  requiredResources: DendroJobRequiredResources;
  tags: string[];
  jobDependencies: string[];
  onNewJobId: (jobId: string) => void;
  staging: boolean;
};

export const CreateJobComponent: FunctionComponent<CreateJobComponentProps> = ({
  buttonLabel,
  selectOptsComponent,
  jobDefinition,
  requiredResources,
  tags,
  jobDependencies,
  onNewJobId,
  staging,
}) => {
  const [creating, setCreating] = useState<boolean>(false);

  const { dendroApiKey, setDendroApiKey } = useDendroApiKey();
  const [computeClientId, setComputeClientId] = useState<string | undefined>(
    undefined,
  );

  const [errorText, setErrorText] = useState<string | undefined>(undefined);

  const handleSubmitNewJob = useCallback(async () => {
    if (!jobDefinition) {
      throw Error("Unexpected: jobDefinition is undefined");
    }
    if (!requiredResources) {
      throw Error("Unexpected: requiredResources is undefined");
    }
    setErrorText(undefined);
    try {
      const secrets = createDendroJobSecrets({ staging });
      const req: CreateJobRequest = {
        type: "createJobRequest",
        serviceName,
        userId: "",
        batchId: "",
        tags,
        jobDefinition,
        requiredResources,
        targetComputeClientIds: computeClientId ? [computeClientId] : undefined,
        secrets,
        jobDependencies,
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
      const rr = await resp.json();
      if (!resp.ok) {
        console.error(resp);
        throw Error(`Error creating job: ${rr.error || resp.statusText}`);
      }
      if (!isCreateJobResponse(rr)) {
        throw Error(`Unexpected response: ${JSON.stringify(rr)}`);
      }
      onNewJobId(rr.job.jobId);
      setCreating(false);
    } catch (err: any) {
      setErrorText(err.message);
    }
  }, [
    dendroApiKey,
    computeClientId,
    onNewJobId,
    requiredResources,
    jobDefinition,
    tags,
    jobDependencies,
    staging,
  ]);

  if (!creating) {
    return (
      <div>
        <Button
          onClick={() => {
            setCreating(true);
          }}
        >
          {buttonLabel}
        </Button>
      </div>
    );
  } else {
    return (
      <div>
        <h3>{buttonLabel}</h3>
        {selectOptsComponent}
        {errorText && <div style={{ color: "red" }}>{errorText}</div>}
        <div>
          <div style={{ paddingTop: 10 }}>
            <SelectDendroApiKeyComponent
              value={dendroApiKey}
              setValue={setDendroApiKey}
            />
          </div>
          <div style={{ paddingTop: 10 }}>
            <SelectDendroComputeClientIdComponent
              value={computeClientId}
              setValue={setComputeClientId}
            />
          </div>
          <div style={{ paddingTop: 10 }}>
            <button
              onClick={handleSubmitNewJob}
              disabled={!dendroApiKey || !jobDefinition}
            >
              SUBMIT JOB
            </button>
            &nbsp;
            <button
              onClick={() => {
                setCreating(false);
              }}
            >
              CANCEL
            </button>
          </div>
        </div>
      </div>
    );
  }
};

type PrepareEphysJobViewProps = {
  jobId: string;
  nwbUrl: string;
  onNewJobId: (jobId: string) => void;
};

const parameterNamesForPrepareEphys = [
  "duration_sec",
  "electrode_indices",
  "freq_min",
  "freq_max",
  "compression_ratio",
  "output_electrical_series_name",
];

const PrepareEphysJobView: FunctionComponent<PrepareEphysJobViewProps> = ({
  jobId,
  nwbUrl,
  onNewJobId,
}) => {
  const { job, refreshJob } = useJob(jobId);
  if (!job) return <div>Loading job...</div>;
  return (
    <div>
      <JobInfoView
        job={job}
        onRefreshJob={refreshJob}
        parameterNames={parameterNamesForPrepareEphys}
      />
      <ViewInNeurosiftLink job={job} />
      <CreateSpikeSortJobComponent
        parentJob={job}
        nwbUrl={nwbUrl}
        onNewJobId={onNewJobId}
      />
    </div>
  );
};

type SpikeSortJobViewProps = {
  jobId: string;
  nwbUrl: string;
  onNewJobId: (jobId: string) => void;
};

const parameterNamesForMountainSort5 = [
  "detect_threshold",
  "channel_radius",
  "output_units_name",
];

const parameterNamesForKilosort4 = ["output_units_name"];

const SpikeSortJobView: FunctionComponent<SpikeSortJobViewProps> = ({
  jobId,
  nwbUrl,
  onNewJobId,
}) => {
  const { job, refreshJob } = useJob(jobId);
  if (!job) return <div>Loading job...</div>;
  if (job.tags.includes("mountainsort5")) {
    return (
      <div>
        <JobInfoView
          job={job}
          onRefreshJob={refreshJob}
          parameterNames={parameterNamesForMountainSort5}
        />
        <ViewInNeurosiftLink job={job} />
        <CreatePostProcessingJobComponent
          spikeSortingJob={job}
          onNewJobId={onNewJobId}
          nwbUrl={nwbUrl}
        />
      </div>
    );
  } else if (job.tags.includes("kilosort4")) {
    return (
      <div>
        <JobInfoView
          job={job}
          onRefreshJob={refreshJob}
          parameterNames={parameterNamesForKilosort4}
        />
        <ViewInNeurosiftLink job={job} />
        <CreatePostProcessingJobComponent
          spikeSortingJob={job}
          onNewJobId={onNewJobId}
          nwbUrl={nwbUrl}
        />
      </div>
    );
  } else {
    return <div>Unexpected job type: {job.tags.join(", ")}</div>;
  }
};

type PostProcessingJobViewProps = {
  jobId: string;
};

const parameterNamesForPostProcessing: string[] = [
  // none
];

const PostProcessingJobView: FunctionComponent<PostProcessingJobViewProps> = ({
  jobId,
}) => {
  const { job, refreshJob } = useJob(jobId);
  if (!job) return <div>Loading job...</div>;
  return (
    <div>
      <JobInfoView
        job={job}
        onRefreshJob={refreshJob}
        parameterNames={parameterNamesForPostProcessing}
      />
      <ViewInNeurosiftLink job={job} />
    </div>
  );
};

type ViewInNeurosiftLinkProps = {
  job: DendroJob;
};

export const ViewInNeurosiftLink: FunctionComponent<
  ViewInNeurosiftLinkProps
> = ({ job }) => {
  const { route } = useRoute();
  if (route.page !== "nwb") {
    throw Error("Unexpected: route.page is not nwb");
  }
  const preNwbOutputUrl = getJobOutputUrl(job, "output");

  const preNeurosiftUrl = useMemo(() => {
    if (!preNwbOutputUrl) return undefined;
    const q: { [key: string]: any } = {};
    q["p"] = "/nwb";
    q["url"] = preNwbOutputUrl;
    if (route.dandisetId) {
      q["dandisetId"] = route.dandisetId;
    }
    if (route.dandisetVersion) {
      q["dandisetVersion"] = route.dandisetVersion;
    }
    q["st"] = "lindi";
    let query = "";
    for (const key in q) {
      if (query) query += "&";
      query += key + "=" + q[key];
    }
    return window.location.origin + "/?" + query;
  }, [preNwbOutputUrl, route]);

  if (job.status !== "completed") return <div />;

  return (
    <div>
      <br />
      <a href={preNeurosiftUrl} target="_blank" rel="noopener noreferrer">
        View output in Neurosift
      </a>
    </div>
  );
};

type ExpandedJobIdsState = {
  [key: string]: boolean;
};

type ExpandedJobIdsAction = {
  type: "toggle";
  jobId: string;
};

export const expandedJobIdsReducer = (
  state: ExpandedJobIdsState,
  action: ExpandedJobIdsAction,
): ExpandedJobIdsState => {
  switch (action.type) {
    case "toggle":
      return {
        ...state,
        [action.jobId]: !state[action.jobId],
      };
    default:
      return state;
  }
};

export const rowIsVisible = (
  expandedJobIds: ExpandedJobIdsState,
  row: AllJobsTreeRow,
): boolean => {
  if (!row.parentRow) return true;
  if (!expandedJobIds[row.parentRow.job.jobId]) return false;
  if (!rowIsVisible(expandedJobIds, row.parentRow)) return false;
  return true;
};

export type AllJobsTreeRow = {
  job: DendroJob;
  indent: number;
  parentRow?: AllJobsTreeRow;
  hasChildren?: boolean;
};

const formatParameterValue = (value: any) => {
  if (typeof value === "object") {
    if (Array.isArray(value)) {
      return intListToString(value);
    }
  }
  return value;
};

export const parameterElementForJob = (job: DendroJob) => {
  return (
    <>
      {job.jobDefinition.parameters.map((p, ii) => (
        <span key={ii}>
          {p.name}:{" "}
          <span style={{ fontWeight: "bold" }}>
            {formatParameterValue(p.value)}
          </span>
          {ii < job.jobDefinition.parameters.length - 1 ? ", " : ""}
        </span>
      ))}
    </>
  );
};

type ExpanderProps = {
  expanded: boolean;
  onClick: () => void;
};

export const Expander: FunctionComponent<ExpanderProps> = ({
  expanded,
  onClick,
}) => {
  return (
    <td>
      <SmallIconButton
        icon={expanded ? <KeyboardArrowDown /> : <KeyboardArrowRight />}
        onClick={onClick}
      />
    </td>
  );
};

type AllJobsTreeProps = {
  allJobs: DendroJob[] | undefined;
  refreshAllJobs: () => void;
  selectedJobId: string | undefined;
  setSelectedJobId: (jobId: string) => void;
};

export const AllJobsTree: FunctionComponent<AllJobsTreeProps> = ({
  allJobs,
  refreshAllJobs,
  selectedJobId,
  setSelectedJobId,
}) => {
  const [expandedJobIds, dispatchExpandedJobIds] = useReducer(
    expandedJobIdsReducer,
    {},
  );
  const rows = useMemo(() => {
    const ret: AllJobsTreeRow[] = [];
    const handlePrepareEphysJobs = () => {
      for (const job of allJobs || []) {
        if (job.tags.includes("prepare_ephys")) {
          const row: AllJobsTreeRow = { job, indent: 0 };
          ret.push(row);
          handleSpikeSortJobs(row);
        }
      }
    };
    const handleSpikeSortJobs = (parentRow: AllJobsTreeRow) => {
      const parentJobOutputUrl = parentRow.job.outputFileResults[0]?.url;
      if (!parentJobOutputUrl) return;
      for (const job of allJobs || []) {
        if (job.tags.includes("spike_sort")) {
          const inputUrl = job.jobDefinition.inputFiles[0]?.url;
          if (inputUrl === parentJobOutputUrl) {
            const row: AllJobsTreeRow = { job, indent: 1, parentRow };
            ret.push(row);
            parentRow.hasChildren = true;
            handlePostProcessingJobs(row);
          }
        }
      }
    };
    const handlePostProcessingJobs = (parentRow: AllJobsTreeRow) => {
      const parentJobOutputUrl = parentRow.job.outputFileResults[0]?.url;
      if (!parentJobOutputUrl) return;
      for (const job of allJobs || []) {
        if (job.tags.includes("post_processing")) {
          const inputUrl = job.jobDefinition.inputFiles[0]?.url;
          if (inputUrl === parentJobOutputUrl) {
            const row: AllJobsTreeRow = { job, indent: 2, parentRow };
            parentRow.hasChildren = true;
            ret.push(row);
          }
        }
      }
    };
    handlePrepareEphysJobs();
    return ret;
  }, [allJobs]);
  const createIndent = (n: number) => {
    return (
      <span>
        {new Array(n).fill(0).map(() => (
          <>&nbsp;&nbsp;&nbsp;&nbsp;</>
        ))}
      </span>
    );
  };
  if (!allJobs) return <div>Loading jobs...</div>;
  return (
    <div>
      <div>
        <SmallIconButton icon={<Refresh />} onClick={refreshAllJobs} />
      </div>
      <table className="nwb-table">
        <thead>
          <tr>
            <th></th>
            <th>Job</th>
            <th>Status</th>
            <th>Created</th>
            <th>Parameters</th>
            {<th />}
          </tr>
        </thead>
        <tbody>
          {rows
            .filter((r) => rowIsVisible(expandedJobIds, r))
            .map((row) => (
              <tr
                key={row.job.jobId}
                style={
                  row.job.jobId === selectedJobId
                    ? { background: "#afafaf" }
                    : {}
                }
              >
                <td>
                  {row.hasChildren && (
                    <Expander
                      expanded={expandedJobIds[row.job.jobId]}
                      onClick={() =>
                        dispatchExpandedJobIds({
                          type: "toggle",
                          jobId: row.job.jobId,
                        })
                      }
                    />
                  )}
                </td>
                <td>
                  {createIndent(row.indent)}
                  <Hyperlink onClick={() => setSelectedJobId(row.job.jobId)}>
                    {row.job.jobDefinition.processorName}
                  </Hyperlink>
                </td>
                <td>{row.job.status}</td>
                <td>{timeAgoString(row.job.timestampCreatedSec)}</td>
                <td>{parameterElementForJob(row.job)}</td>
                <td>
                  <SmallIconButton
                    icon={<OpenInNew />}
                    onClick={() => {
                      window.open(
                        `https://dendro.vercel.app/job/${row.job.jobId}`,
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

const useAllSpikeSortingJobs = (nwbUrl: string) => {
  const tags = useMemo(() => [...tagsBase, `nwb:${nwbUrl}`], [nwbUrl]);
  const { allJobs, refreshAllJobs } = useAllJobs({
    serviceName: "hello_world_service",
    appName: undefined,
    processorName: undefined,
    tags,
    inputFileUrl: undefined,
    jobFilter: undefined,
  });
  return { allJobs, refreshAllJobs };
};

type SelectPrepareEphysOptsProps = {
  prepareEphysOpts: PrepareEphysOpts;
  setPrepareEphysOpts: (opts: PrepareEphysOpts) => void;
};

const SelectPrepareEphysOpts: FunctionComponent<
  SelectPrepareEphysOptsProps
> = ({ prepareEphysOpts, setPrepareEphysOpts }) => {
  return (
    <div>
      <table>
        <tbody>
          <tr>
            <td>Duration (minutes):</td>
            <td>
              <InputChoices
                value={
                  prepareEphysOpts.duration_sec === 0
                    ? "full"
                    : prepareEphysOpts.duration_sec / 60
                }
                choices={[1, 5, 20, 60, "full"]}
                onChange={(duration_min) =>
                  setPrepareEphysOpts({
                    ...prepareEphysOpts,
                    duration_sec:
                      duration_min === "full"
                        ? 0
                        : (duration_min as number) * 60,
                  })
                }
              />
            </td>
          </tr>
          <tr>
            <td>Electrode indices:</td>
            <td>
              <IntListInput
                value={prepareEphysOpts.electrode_indices}
                onChange={(electrode_indices) =>
                  setPrepareEphysOpts({
                    ...prepareEphysOpts,
                    electrode_indices,
                  })
                }
              />
            </td>
          </tr>
          <tr>
            <td>Frequency range (Hz):</td>
            <td>
              <InputChoices
                value={prepareEphysOpts.freq_min}
                choices={[300]}
                onChange={(freq_min) =>
                  setPrepareEphysOpts({
                    ...prepareEphysOpts,
                    freq_min: freq_min as number,
                  })
                }
              />
              -
              <InputChoices
                value={prepareEphysOpts.freq_max}
                choices={[6000, 9000, 12000]}
                onChange={(freq_max) =>
                  setPrepareEphysOpts({
                    ...prepareEphysOpts,
                    freq_max: freq_max as number,
                  })
                }
              />
            </td>
          </tr>
          <tr>
            <td>Compression ratio:</td>
            <td>
              <InputChoices
                value={
                  prepareEphysOpts.compression_ratio === 0 ? "lossless" : 12
                }
                choices={["lossless", 4, 8, 12, 16, 20, 30, 40, 50, 75, 100]}
                onChange={(compressionRatio) => {
                  const cr =
                    compressionRatio === "lossless"
                      ? 0
                      : (compressionRatio as number);
                  setPrepareEphysOpts({
                    ...prepareEphysOpts,
                    compression_ratio: cr,
                  });
                }}
              />
            </td>
          </tr>
          <tr>
            <td>Output electrical series name:</td>
            <td>
              <input
                type="text"
                value={prepareEphysOpts.output_electrical_series_name}
                onChange={(e) =>
                  setPrepareEphysOpts({
                    ...prepareEphysOpts,
                    output_electrical_series_name: e.target.value,
                  })
                }
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

type IntListInputProps = {
  value: number[];
  onChange: (value: number[]) => void;
};

const IntListInput: FunctionComponent<IntListInputProps> = ({
  value,
  onChange,
}) => {
  const [text, setText] = useState(value.join(","));
  useEffect(() => {
    setText(intListToString(value));
  }, [value]);
  return (
    <input
      type="text"
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        const v = stringToIntList(text);
        onChange(v);
      }}
    />
  );
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

const stringToIntList = (s: string) => {
  const runStrings = s.split(",").map((x) => x.trim());
  const ret: number[] = [];
  for (const runString of runStrings) {
    if (!runString) continue;
    const m = runString.match(/^(\d+)-(\d+)$/);
    if (m) {
      const a = parseInt(m[1]);
      const b = parseInt(m[2]);
      for (let i = a; i <= b; i++) {
        ret.push(i);
      }
    } else {
      const a = parseInt(runString);
      ret.push(a);
    }
  }
  return ret;
};

type SelectPostProcessingOptsProps = {
  postProcessingOpts: PostProcessingOpts;
  setPostProcessingOpts: (opts: PostProcessingOpts) => void;
};

const SelectPostProcessingOpts: FunctionComponent<
  SelectPostProcessingOptsProps
> = () => {
  return <div />;
};

const getInputParameterValue = (job: DendroJob, name: string) => {
  const pp = job.jobDefinition.parameters.find((p) => p.name === name);
  if (!pp) {
    throw Error(`Parameter not found: ${name}`);
  }
  return pp.value;
};

export default SpikeSortingView;
