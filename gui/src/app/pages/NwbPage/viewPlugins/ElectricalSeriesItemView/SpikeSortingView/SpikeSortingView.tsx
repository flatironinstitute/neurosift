import { Button } from "@mui/material";
import {
  CreateJobRequest,
  PairioJob,
  PairioJobDefinition,
  PairioJobParameter,
  PairioJobRequiredResources,
  isCreateJobResponse,
} from "app/pairio/types";
import useRoute from "app/useRoute";
import {
  FunctionComponent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNwbFile } from "../../../NwbFileContext";
import {
  AllJobsView,
  SelectPairioApiKeyComponent,
  SelectPairioComputeClientIdComponent,
  getJobOutputUrl,
  useAllJobs,
  useJob,
  usePairioApiKey,
} from "../../CEBRA/PairioHelpers";
import { JobInfoView } from "../../CEBRA/PairioItemView";
import useTimeSeriesInfo from "../../TimeSeries/useTimeseriesInfo";
import InputChoices from "./InputChoices";
import {
  spikeSortingKilosort4ParameterNames,
  useSpikeSortingKilosort4Step,
} from "./kilosort4";
import {
  spikeSortingMountainSort5ParameterNames,
  useSpikeSortingMountainSort5Step,
} from "./mountainsort5";

type SpikeSortingViewProps = {
  width: number;
  height: number;
  path: string;
};

const serviceName = "hello_world_service";
const title = "Spike Sorting (under construction - do not use!)";
const tagsPrepareEphys = ["neurosift", "spike_sorting", "prepare_ephys"];
const tagsSpikeSorting = ["neurosift", "spike_sorting", "spike_sort"];

const tagsSpikeSortingMountainSort5 = [...tagsSpikeSorting, "mountainsort5"];

const tagsSpikeSortingKilosort4 = [...tagsSpikeSorting, "kilosort4"];

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

const prepareEphysParameterNames = [
  "duration_sec",
  "electrode_indices",
  "freq_min",
  "freq_max",
  "compression_ratio",
  "output_electrical_series_name",
];

const usePrepareEphysStep = (o: { path: string; nwbUrl: string }) => {
  const { path, nwbUrl } = o;
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

  const [prepareEphysJobId, setPrepareEphysJobId] = useState<
    string | undefined
  >(undefined);
  useEffect(() => {
    setPrepareEphysJobId(undefined);
  }, [prepareEphysOpts]);

  const { job: prepareEphysJob, refreshJob: refreshPrepareEphysJob } =
    useJob(prepareEphysJobId);

  const prepareEphysJobParameters: PairioJobParameter[] = useMemo(() => {
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

  const prepareEphysJobRequiredResources: PairioJobRequiredResources =
    useMemo(() => {
      return {
        numCpus: 4,
        numGpus: 0,
        memoryGb: 4,
        timeSec: 60 * 60 * 3,
      };
    }, []);

  const prepareEphysJobDefinition: PairioJobDefinition = useMemo(() => {
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

  const selectPrepareEphysOptsComponent = (
    <SelectPrepareEphysOpts
      prepareEphysOpts={prepareEphysOpts}
      setPrepareEphysOpts={setPrepareEphysOpts}
    />
  );

  return {
    selectPrepareEphysOptsComponent,
    prepareEphysJobId,
    setPrepareEphysJobId,
    prepareEphysJob,
    refreshPrepareEphysJob,
    prepareEphysJobRequiredResources,
    prepareEphysJobDefinition,
  };
};

type PostProcessingOpts = {
  // none
};

const defaultPostProcessingOpts: PostProcessingOpts = {
  // none
};

const tagsPostProcessing = ["neurosift", "spike_sorting", "post_processing"];

const usePostProcessingStep = (spikeSortingJob?: PairioJob) => {
  const [postProcessingOpts, setPostProcessingOpts] =
    useState<PostProcessingOpts>(defaultPostProcessingOpts);

  const selectPostProcessingOptsComponent = (
    <SelectPostProcessingOpts
      postProcessingOpts={postProcessingOpts}
      setPostProcessingOpts={setPostProcessingOpts}
    />
  );

  const [postProcessingJobId, setPostProcessingJobId] = useState<
    string | undefined
  >(undefined);
  const { job: postProcessingJob, refreshJob: refreshPostProcessingJob } =
    useJob(postProcessingJobId);

  const postProcessingRequiredResources: PairioJobRequiredResources =
    useMemo(() => {
      return {
        numCpus: 4,
        numGpus: 0,
        memoryGb: 4,
        timeSec: 60 * 50,
      };
    }, []);

  const postProcessingJobDefinition: PairioJobDefinition | undefined =
    useMemo(() => {
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

  useEffect(() => {
    setPostProcessingJobId(undefined);
  }, [spikeSortingJob]);

  if (!spikeSortingJob) {
    return {
      selectPostProcessingOptsComponent: undefined,
      postProcessingJobId: undefined,
      setPostProcessingJobId: () => {},
      postProcessingJob: undefined,
      refreshPostProcessingJob: () => {},
      postProcessingRequiredResources: undefined,
      postProcessingJobDefinition: undefined,
    };
  }

  return {
    selectPostProcessingOptsComponent,
    postProcessingJobId,
    setPostProcessingJobId,
    postProcessingJob,
    refreshPostProcessingJob,
    postProcessingRequiredResources,
    postProcessingJobDefinition,
  };
};

type SpikeSortingAlgorithmChoices = "mountainsort5" | "kilosort4";

const spikeSortingAlgorithmChoices: SpikeSortingAlgorithmChoices[] = [
  "mountainsort5",
  "kilosort4",
];

const SpikeSortingView: FunctionComponent<SpikeSortingViewProps> = ({
  width,
  height,
  path,
}) => {
  const nwbFile = useNwbFile();
  if (!nwbFile)
    throw Error("Unexpected: nwbFile is undefined (no context provider)");

  const nwbUrl = useMemo(() => {
    return nwbFile.getUrls()[0];
  }, [nwbFile]);

  const { samplingRate } = useTimeSeriesInfo(nwbFile, path);

  const [spikeSortingAlgorithm, setSpikeSortingAlgorithm] = useState<
    SpikeSortingAlgorithmChoices | undefined
  >(undefined);

  const {
    selectPrepareEphysOptsComponent,
    prepareEphysJobId,
    setPrepareEphysJobId,
    prepareEphysJob,
    refreshPrepareEphysJob,
    prepareEphysJobRequiredResources,
    prepareEphysJobDefinition,
  } = usePrepareEphysStep({ path, nwbUrl });

  const {
    selectSpikeSortingMountainSort5OptsComponent,
    spikeSortingMountainSort5JobId,
    setSpikeSortingMountainSort5JobId,
    spikeSortingMountainSort5Job,
    refreshSpikeSortingMountainSort5Job,
    spikeSortingMountainSort5RequiredResources,
    spikeSortingMountainSort5JobDefinition,
  } = useSpikeSortingMountainSort5Step(prepareEphysJob);

  const {
    selectSpikeSortingKilosort4OptsComponent,
    spikeSortingKilosort4JobId,
    setSpikeSortingKilosort4JobId,
    spikeSortingKilosort4Job,
    refreshSpikeSortingKilosort4Job,
    spikeSortingKilosort4RequiredResources,
    spikeSortingKilosort4JobDefinition,
  } = useSpikeSortingKilosort4Step(prepareEphysJob);

  let spikeSortingJobId: string | undefined;
  let spikeSortingJob: PairioJob | undefined;
  let selectSpikeSortingOptsComponent: any;
  let spikeSortingJobDefinition: PairioJobDefinition | undefined;
  if (spikeSortingAlgorithm === "mountainsort5") {
    spikeSortingJobId = spikeSortingMountainSort5JobId;
    spikeSortingJob = spikeSortingMountainSort5Job;
    selectSpikeSortingOptsComponent =
      selectSpikeSortingMountainSort5OptsComponent;
    spikeSortingJobDefinition = spikeSortingMountainSort5JobDefinition;
  } else if (spikeSortingAlgorithm === "kilosort4") {
    spikeSortingJobId = spikeSortingKilosort4JobId;
    spikeSortingJob = spikeSortingKilosort4Job;
    selectSpikeSortingOptsComponent = selectSpikeSortingKilosort4OptsComponent;
    spikeSortingJobDefinition = spikeSortingKilosort4JobDefinition;
  } else {
    //
  }

  useEffect(() => {
    setSpikeSortingAlgorithm(undefined);
  }, [prepareEphysJobId]);

  const prepareEphysOutputNwbUrl = useMemo(
    () => getJobOutputUrl(prepareEphysJob, "output"),
    [prepareEphysJob],
  );

  const {
    selectPostProcessingOptsComponent,
    postProcessingJobId,
    setPostProcessingJobId,
    postProcessingJob,
    refreshPostProcessingJob,
    postProcessingRequiredResources,
    postProcessingJobDefinition,
  } = usePostProcessingStep(spikeSortingJob);

  const prepareEphysJobDependencies = useMemo(() => {
    return [];
  }, []);

  const spikeSortingJobDependencies = useMemo(() => {
    return prepareEphysJobId ? [prepareEphysJobId] : [];
  }, [prepareEphysJobId]);

  const postProcessingJobDependencies = useMemo(() => {
    return spikeSortingJobId ? [spikeSortingJobId] : [];
  }, [spikeSortingJobId]);

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
        <h3>Step 1: Prepare dataset</h3>
        <Step
          appName="hello_neurosift"
          processorName="prepare_ephys_spike_sorting_dataset"
          tags={tagsPrepareEphys}
          inputFileUrl={nwbUrl}
          requiredResources={prepareEphysJobRequiredResources}
          jobId={prepareEphysJobId}
          setJobId={setPrepareEphysJobId}
          job={prepareEphysJob}
          refreshJob={refreshPrepareEphysJob}
          selectOptsComponent={selectPrepareEphysOptsComponent}
          parameterNames={prepareEphysParameterNames}
          jobDefinition={prepareEphysJobDefinition}
          jobDependencies={prepareEphysJobDependencies}
        />
        {prepareEphysJobId && prepareEphysJob && prepareEphysOutputNwbUrl && (
          <>
            <h3>Step 2: Spike sorting</h3>
            <SelectSpikeSortingAlgorithmComponent
              value={spikeSortingAlgorithm}
              setValue={setSpikeSortingAlgorithm}
            />
            {spikeSortingAlgorithm === "mountainsort5" ? (
              <Step
                appName="hello_neurosift"
                processorName="mountainsort5"
                tags={tagsSpikeSortingMountainSort5}
                inputFileUrl={prepareEphysOutputNwbUrl}
                requiredResources={spikeSortingMountainSort5RequiredResources}
                jobId={spikeSortingMountainSort5JobId}
                setJobId={setSpikeSortingMountainSort5JobId}
                job={spikeSortingMountainSort5Job}
                refreshJob={refreshSpikeSortingMountainSort5Job}
                selectOptsComponent={
                  selectSpikeSortingMountainSort5OptsComponent
                }
                parameterNames={spikeSortingMountainSort5ParameterNames}
                jobDefinition={spikeSortingMountainSort5JobDefinition}
                jobDependencies={spikeSortingJobDependencies}
              />
            ) : spikeSortingAlgorithm === "kilosort4" ? (
              <Step
                appName="hello_kilosort4"
                processorName="kilosort4"
                tags={tagsSpikeSortingKilosort4}
                inputFileUrl={prepareEphysOutputNwbUrl}
                requiredResources={spikeSortingKilosort4RequiredResources}
                jobId={spikeSortingKilosort4JobId}
                setJobId={setSpikeSortingKilosort4JobId}
                job={spikeSortingKilosort4Job}
                refreshJob={refreshSpikeSortingKilosort4Job}
                selectOptsComponent={selectSpikeSortingKilosort4OptsComponent}
                parameterNames={spikeSortingKilosort4ParameterNames}
                jobDefinition={spikeSortingKilosort4JobDefinition}
                jobDependencies={spikeSortingJobDependencies}
              />
            ) : (
              <div>
                Unexpected spike sorting algorithm: {spikeSortingAlgorithm}
              </div>
            )}
          </>
        )}
        {spikeSortingJobId &&
          spikeSortingJob &&
          spikeSortingJobDefinition &&
          postProcessingRequiredResources && (
            <>
              <h3>Step 3: Post-processing</h3>
              <Step
                appName="hello_neurosift"
                processorName="spike_sorting_post_processing"
                tags={tagsPostProcessing}
                inputFileUrl={getJobOutputUrl(spikeSortingJob, "output") || ""}
                requiredResources={postProcessingRequiredResources}
                jobId={postProcessingJobId}
                setJobId={setPostProcessingJobId}
                job={postProcessingJob}
                refreshJob={refreshPostProcessingJob}
                selectOptsComponent={selectPostProcessingOptsComponent}
                parameterNames={[]}
                jobDefinition={postProcessingJobDefinition}
                jobDependencies={postProcessingJobDependencies}
              />
            </>
          )}
      </div>
    </div>
  );
};

type SelectSpikeSortingAlgorithmProps = {
  value: SpikeSortingAlgorithmChoices | undefined;
  setValue: (value: SpikeSortingAlgorithmChoices | undefined) => void;
};

const SelectSpikeSortingAlgorithmComponent: FunctionComponent<
  SelectSpikeSortingAlgorithmProps
> = ({ value, setValue }) => {
  return (
    <div>
      Select spike sorting algorithm:&nbsp;
      <>
        <input
          type="radio"
          onClick={() => setValue("mountainsort5")}
          checked={value === "mountainsort5"}
        />{" "}
        MountainSort 5
      </>
      <>
        <input
          type="radio"
          onClick={() => setValue("kilosort4")}
          checked={value === "kilosort4"}
        />{" "}
        Kilosort 4
      </>
    </div>
  );
};

type StepProps = {
  appName: string;
  processorName: string;
  tags: string[];
  inputFileUrl: string;
  requiredResources?: PairioJobRequiredResources;
  jobId?: string;
  setJobId: (jobId: string | undefined) => void;
  job?: PairioJob;
  refreshJob: () => void;
  selectOptsComponent: any;
  parameterNames: string[];
  jobDefinition?: PairioJobDefinition;
  jobDependencies: string[];
};

const Step: FunctionComponent<StepProps> = ({
  appName,
  processorName,
  tags,
  inputFileUrl,
  requiredResources,
  jobId,
  setJobId,
  job,
  refreshJob,
  selectOptsComponent: selectParametersComponent,
  parameterNames,
  jobDefinition,
  jobDependencies,
}) => {
  const nwbFile = useNwbFile();
  if (!nwbFile)
    throw Error("Unexpected: nwbFile is undefined (no context provider)");

  const nwbUrl = useMemo(() => {
    return nwbFile.getUrls()[0];
  }, [nwbFile]);

  const [definingNewJob, setDefiningNewJob] = useState(false);

  const [errorText, setErrorText] = useState<string | undefined>(undefined);

  const { pairioApiKey, setPairioApiKey } = usePairioApiKey();
  const [computeClientId, setComputeClientId] = useState<string | undefined>(
    undefined,
  );

  const { allJobs, refreshAllJobs } = useAllJobs({
    appName,
    processorName,
    tags,
    inputFileUrl,
    jobFilter: undefined,
  });

  const handleSubmitNewJob = useCallback(async () => {
    if (!jobDefinition) {
      throw Error("Unexpected: jobDefinition is undefined");
    }
    if (!requiredResources) {
      throw Error("Unexpected: requiredResources is undefined");
    }
    setErrorText(undefined);
    try {
      const req: CreateJobRequest = {
        type: "createJobRequest",
        serviceName,
        userId: "",
        batchId: "",
        tags,
        jobDefinition,
        requiredResources,
        targetComputeClientIds: computeClientId ? [computeClientId] : undefined,
        secrets: [],
        jobDependencies,
        skipCache: false,
        rerunFailing: true,
        deleteFailing: true,
      };
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${pairioApiKey}`,
      };
      const resp = await fetch(`https://pairio.vercel.app/api/createJob`, {
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
      setJobId(rr.job.jobId);
      refreshAllJobs();
    } catch (err: any) {
      setErrorText(err.message);
    }
  }, [
    pairioApiKey,
    computeClientId,
    setJobId,
    refreshAllJobs,
    requiredResources,
    jobDefinition,
    tags,
    jobDependencies,
  ]);

  useEffect(() => {
    // when job ID changes, reset definingNewJob
    setDefiningNewJob(false);
  }, [jobId]);

  return (
    <div>
      <AllJobsView
        allJobs={allJobs || undefined}
        refreshAllJobs={refreshAllJobs}
        parameterNames={parameterNames}
        selectedJobId={jobId}
        onJobClicked={setJobId}
      />
      {errorText && <div style={{ color: "red" }}>{errorText}</div>}
      {definingNewJob && (
        <>
          {selectParametersComponent}
          <div>
            <div style={{ paddingTop: 10 }}>
              <SelectPairioApiKeyComponent
                value={pairioApiKey}
                setValue={setPairioApiKey}
              />
            </div>
            <div style={{ paddingTop: 10 }}>
              <SelectPairioComputeClientIdComponent
                value={computeClientId}
                setValue={setComputeClientId}
              />
            </div>
            <div style={{ paddingTop: 10 }}>
              <button
                onClick={handleSubmitNewJob}
                disabled={!pairioApiKey || !jobDefinition}
              >
                SUBMIT JOB
              </button>
            </div>
          </div>
        </>
      )}
      {!definingNewJob && (
        <Button onClick={() => setDefiningNewJob(true)}>Create new job</Button>
      )}
      {jobId && job && (
        <JobInfoView
          job={job}
          onRefreshJob={() => {
            refreshJob();
          }}
          parameterNames={parameterNames}
        />
      )}
      {jobId && job && job.status === "completed" && (
        <NeurosiftLink url={getJobOutputUrl(job, "output")} />
      )}
    </div>
  );
};

type NeurosiftLinkProps = {
  url: string | undefined;
};

const NeurosiftLink: FunctionComponent<NeurosiftLinkProps> = ({ url }) => {
  const { route } = useRoute();
  if (route.page !== "nwb") {
    throw Error('Unexpected: route.page is not "nwb"');
  }
  if (!url) return <div>url is undefined</div>;
  let neurosiftUrl = `https://neurosift.app/?p=/nwb&url=${url}`;
  if (url.endsWith(".lindi.tar") || url.endsWith(".lindi.json")) {
    neurosiftUrl += "&st=lindi";
  }
  if (route.dandisetId) {
    neurosiftUrl += `&dandisetId=${route.dandisetId}`;
  }
  if (route.dandisetVersion) {
    neurosiftUrl += `&dandisetVersion=${route.dandisetVersion}`;
  }
  return (
    <a href={neurosiftUrl} target="_blank" rel="noopener noreferrer">
      View in Neurosift
    </a>
  );
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
                value={prepareEphysOpts.compression_ratio}
                choices={["none", 4, 8, 12, 16, 20, 30, 40, 50, 75, 100]}
                onChange={(compressionRatio) =>
                  setPrepareEphysOpts({
                    ...prepareEphysOpts,
                    compression_ratio: compressionRatio as number,
                  })
                }
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

const getInputParameterValue = (job: PairioJob, name: string) => {
  const pp = job.jobDefinition.parameters.find((p) => p.name === name);
  if (!pp) {
    throw Error(`Parameter not found: ${name}`);
  }
  return pp.value;
};

export default SpikeSortingView;
