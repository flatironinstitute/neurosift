import { RemoteH5FileX } from "@remote-h5-file/index";
import {
  CreateJobRequest,
  PairioJob,
  PairioJobDefinition,
  PairioJobRequiredResources,
  isCreateJobResponse,
} from "app/pairio/types";
import {
  FunctionComponent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNwbFile } from "../../../NwbFileContext";
import {
  SelectPairioApiKeyComponent,
  SelectPairioComputeClientIdComponent,
  getJobOutputUrl,
  useJob,
  usePairioApiKey,
} from "../../CEBRA/PairioHelpers";
import useTimeSeriesInfo from "../../TimeSeries/useTimeseriesInfo";
import { Button, Select } from "@mui/material";
import { JobInfoView } from "../../CEBRA/PairioItemView";
import useRoute from "app/useRoute";

type SpikeSortingViewProps = {
  width: number;
  height: number;
  path: string;
};

const serviceName = "hello_world_service";
const title = "Spike Sorting (under construction - do not use!)";
const tagsPrepareDataset = ["neurosift", "prepare_ephys_spike_sorting_dataset"];
const tagsSpikeSorting = ["neurosift", "spike_sorting"];

type PrepareDatasetOpts = {
  duration_sec: number; // 0 means full duration
  electrode_indices: number[];
  freq_min: number;
  freq_max: number;
  compression_ratio: number;
  output_electrical_series_name: string;
};

const defaultPrepareDatasetOpts: PrepareDatasetOpts = {
  duration_sec: 60,
  electrode_indices: [0],
  freq_min: 300,
  freq_max: 6000,
  compression_ratio: 12,
  output_electrical_series_name: "",
};

const prepareDatasetParameterNames = [
  "duration_sec",
  "electrode_indices",
  "freq_min",
  "freq_max",
  "compression_ratio",
  "output_electrical_series_name",
];

type SpikeSortingOpts = {
  detect_threshold: number;
};

const defaultSpikeSortingOpts: SpikeSortingOpts = {
  detect_threshold: 6,
};

const spikeSortingParameterNames = ["detect_threshold"];

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

  const [prepareDatasetOpts, setPrepareDatasetOpts] =
    useState<PrepareDatasetOpts>(defaultPrepareDatasetOpts);
  useEffect(() => {
    if (!prepareDatasetOpts.output_electrical_series_name) {
      const name = path.split("/").slice(-1)[0];
      setPrepareDatasetOpts((o) => ({
        ...o,
        output_electrical_series_name: name + "_pre",
      }));
    }
  }, [path, prepareDatasetOpts.output_electrical_series_name]);

  const [prepareDatasetJobId, setPrepareDatasetJobId] = useState<
    string | undefined
  >(undefined);
  useEffect(() => {
    setPrepareDatasetJobId(undefined);
  }, [prepareDatasetOpts]);

  const { job: prepareDatasetJob, refreshJob: refreshPrepareDatasetJob } =
    useJob(prepareDatasetJobId);

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
        <Step1
          electricalSeriesPath={path}
          prepareDatasetOpts={prepareDatasetOpts}
          setPrepareDatasetOpts={setPrepareDatasetOpts}
          prepareDatasetJobId={prepareDatasetJobId}
          setPrepareDatasetJobId={setPrepareDatasetJobId}
          prepareDatasetJob={prepareDatasetJob}
          refreshPrepareDatasetJob={refreshPrepareDatasetJob}
        />
        {prepareDatasetJobId &&
          prepareDatasetJob &&
          prepareDatasetJob.status === "completed" && (
            <>
              <h3>Step 2: Spike sorting</h3>
              <Step2 prepareDatasetJob={prepareDatasetJob} />
            </>
          )}
      </div>
    </div>
  );
};

type Step1Props = {
  electricalSeriesPath: string;
  prepareDatasetOpts: PrepareDatasetOpts;
  setPrepareDatasetOpts: (opts: PrepareDatasetOpts) => void;
  prepareDatasetJobId?: string;
  setPrepareDatasetJobId: (jobId: string) => void;
  prepareDatasetJob?: PairioJob;
  refreshPrepareDatasetJob: () => void;
};

const Step1: FunctionComponent<Step1Props> = ({
  electricalSeriesPath,
  prepareDatasetOpts,
  setPrepareDatasetOpts,
  prepareDatasetJobId,
  setPrepareDatasetJobId,
  prepareDatasetJob,
  refreshPrepareDatasetJob,
}) => {
  const nwbFile = useNwbFile();
  if (!nwbFile)
    throw Error("Unexpected: nwbFile is undefined (no context provider)");

  const nwbUrl = useMemo(() => {
    return nwbFile.getUrls()[0];
  }, [nwbFile]);

  const [submittingNewPrepareDatasetJob, setSubmittingNewPrepareDatasetJob] =
    useState(false);

  const [errorText, setErrorText] = useState<string | undefined>(undefined);

  const { pairioApiKey, setPairioApiKey } = usePairioApiKey();
  const [computeClientId, setComputeClientId] = useState<string | undefined>(
    undefined,
  );

  const handleSubmitNewPrepareDatasetJob = useCallback(async () => {
    const jobDefinition: PairioJobDefinition = {
      appName: "hello_neurosift",
      processorName: "prepare_ephys_spike_sorting_dataset",
      inputFiles: [
        {
          name: "input",
          fileBaseName: nwbUrl.endsWith(".lindi.json")
            ? "input.lindi.json"
            : nwbUrl.endsWith(".lindi")
              ? "input.lindi"
              : "input.nwb",
          url: nwbUrl,
        },
      ],
      outputFiles: [
        {
          name: "output",
          fileBaseName: "pre.nwb.lindi",
        },
      ],
      parameters: [
        { name: "electrical_series_path", value: electricalSeriesPath },
        { name: "duration_sec", value: prepareDatasetOpts.duration_sec },
        {
          name: "electrode_indices",
          value: prepareDatasetOpts.electrode_indices,
        },
        { name: "freq_min", value: prepareDatasetOpts.freq_min },
        { name: "freq_max", value: prepareDatasetOpts.freq_max },
        {
          name: "compression_ratio",
          value: prepareDatasetOpts.compression_ratio,
        },
        {
          name: "output_electrical_series_name",
          value: prepareDatasetOpts.output_electrical_series_name,
        },
      ],
    };
    const requiredResources: PairioJobRequiredResources = {
      numCpus: 4,
      numGpus: 0,
      memoryGb: 4,
      timeSec: 60 * 50,
    };
    setErrorText(undefined);
    try {
      const req: CreateJobRequest = {
        type: "createJobRequest",
        serviceName,
        userId: "",
        batchId: "",
        tags: tagsPrepareDataset,
        jobDefinition,
        requiredResources,
        targetComputeClientIds: computeClientId ? [computeClientId] : undefined,
        secrets: [],
        jobDependencies: [],
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
      if (!resp.ok) {
        console.error(resp);
        throw Error(`Error creating job: ${resp.statusText}`);
      }
      const rr = await resp.json();
      if (!isCreateJobResponse(rr)) {
        throw Error(`Unexpected response: ${JSON.stringify(rr)}`);
      }
      setPrepareDatasetJobId(rr.job.jobId);
    } catch (err: any) {
      setErrorText(err.message);
    }
  }, [
    prepareDatasetOpts,
    electricalSeriesPath,
    nwbUrl,
    pairioApiKey,
    computeClientId,
    setPrepareDatasetJobId,
  ]);

  return (
    <div>
      <SelectPrepareDatasetOpts
        prepareDatasetOpts={prepareDatasetOpts}
        setPrepareDatasetOpts={setPrepareDatasetOpts}
      />
      {(!prepareDatasetJobId || (prepareDatasetJob && prepareDatasetJob.status === 'failed')) && (
        <>
          {!submittingNewPrepareDatasetJob && (
            <Button onClick={() => setSubmittingNewPrepareDatasetJob(true)}>
              submit
            </Button>
          )}
          {submittingNewPrepareDatasetJob && (
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
                  onClick={handleSubmitNewPrepareDatasetJob}
                  disabled={!pairioApiKey}
                >
                  SUBMIT JOB
                </button>
                {errorText && <div style={{ color: "red" }}>{errorText}</div>}
              </div>
            </div>
          )}
        </>
      )}
      {prepareDatasetJobId && prepareDatasetJob && (
        <JobInfoView
          job={prepareDatasetJob}
          onRefreshJob={() => {
            refreshPrepareDatasetJob();
          }}
          parameterNames={prepareDatasetParameterNames}
        />
      )}
      {prepareDatasetJobId &&
        prepareDatasetJob &&
        prepareDatasetJob.status === "completed" && (
          <NeurosiftLink url={getJobOutputUrl(prepareDatasetJob, "output")} />
        )}
    </div>
  );
};

type Step2Props = {
  prepareDatasetJob: PairioJob;
};

const Step2: FunctionComponent<Step2Props> = ({ prepareDatasetJob }) => {
  const { inputNwbUrl, electricalSeriesPath } = useMemo(() => {
    const x = prepareDatasetJob.outputFileResults.find(
      (x) => x.name === "output",
    );
    if (!x) {
      throw Error("Unexpected: output file not found in job");
    }
    const inputNwbUrl = x.url;
    const pp = prepareDatasetJob.jobDefinition.parameters.find(
      (p) => p.name === "output_electrical_series_name",
    );
    if (!pp) {
      throw Error(
        "Unexpected: output_electrical_series_name parameter not found in job",
      );
    }
    const outputElectricalSeriesName = pp.value as string;
    const outputElectricalSeriesPath = `acquisition/${outputElectricalSeriesName}`;
    return { inputNwbUrl, electricalSeriesPath: outputElectricalSeriesPath };
  }, [prepareDatasetJob]);

  const [spikeSortingOpts, setSpikeSortingOpts] = useState<SpikeSortingOpts>(
    defaultSpikeSortingOpts,
  );

  const [spikeSortingJobId, setSpikeSortingJobId] = useState<string | undefined>(
    undefined,
  );
  const { job: spikeSortingJob, refreshJob: refreshSpikeSortingJob } = useJob(
    spikeSortingJobId,
  );
  const [submittingNewSpikeSortingJob, setSubmittingNewSpikeSortingJob] = useState(
    false,
  );
  useEffect(() => {
    setSpikeSortingJobId(undefined);
  }, [spikeSortingOpts]);

  const { pairioApiKey, setPairioApiKey } = usePairioApiKey();
  const [computeClientId, setComputeClientId] = useState<string | undefined>(undefined);

  const [errorText, setErrorText] = useState<string | undefined>(undefined);

  const handleSubmitNewSpikeSortingJob = useCallback(async () => {
    const jobDefinition: PairioJobDefinition = {
      appName: "hello_neurosift",
      processorName: "mountainsort5",
      inputFiles: [
        {
          name: "input",
          fileBaseName: "input.nwb.lindi",
          url: inputNwbUrl,
        },
      ],
      outputFiles: [
        {
          name: "output",
          fileBaseName: "output.nwb.lindi",
        },
      ],
      parameters: [
        { name: "electrical_series_path", value: electricalSeriesPath },
        { name: "output_units_name", value: "units_mountainsort5" },
        { name: "detect_threshold", value: spikeSortingOpts.detect_threshold },
      ],
    };
    const requiredResources: PairioJobRequiredResources = {
      numCpus: 4,
      numGpus: 0,
      memoryGb: 4,
      timeSec: 60 * 50,
    };
    setErrorText(undefined);
    try {
      const req: CreateJobRequest = {
        type: "createJobRequest",
        serviceName,
        userId: "",
        batchId: "",
        tags: tagsSpikeSorting,
        jobDefinition,
        requiredResources,
        targetComputeClientIds: computeClientId ? [computeClientId] : undefined,
        secrets: [],
        jobDependencies: [prepareDatasetJob.jobId],
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
      if (!resp.ok) {
        console.error(resp);
        throw Error(`Error creating job: ${resp.statusText}`);
      }
      const rr = await resp.json();
      if (!isCreateJobResponse(rr)) {
        throw Error(`Unexpected response: ${JSON.stringify(rr)}`);
      }
      setSpikeSortingJobId(rr.job.jobId);
    } catch (err: any) {
      setErrorText(err.message);
    }
  }, [spikeSortingOpts, inputNwbUrl, electricalSeriesPath, pairioApiKey, computeClientId, prepareDatasetJob]);

  return (
    <div>
      <SelectSpikeSortingOpts
        spikeSortingOpts={spikeSortingOpts}
        setSpikeSortingOpts={setSpikeSortingOpts}
      />
      {(!spikeSortingJobId || (spikeSortingJob && spikeSortingJob.status === 'failed')) && (
        <>
          {errorText && <div style={{ color: "red" }}>{errorText}</div>}
          {!submittingNewSpikeSortingJob && (
            <Button onClick={() => setSubmittingNewSpikeSortingJob(true)}>
              submit
            </Button>
          )}
          {submittingNewSpikeSortingJob && (
            <div>
              <SelectPairioApiKeyComponent value={pairioApiKey} setValue={setPairioApiKey} />
              <SelectPairioComputeClientIdComponent value={computeClientId} setValue={setComputeClientId} />
              <Button onClick={handleSubmitNewSpikeSortingJob} disabled={false}>
                SUBMIT JOB
              </Button>
            </div>
          )}
        </>
      )}
      {spikeSortingJobId && spikeSortingJob && (
        <JobInfoView
          job={spikeSortingJob}
          onRefreshJob={() => {
            refreshSpikeSortingJob();
          }}
          parameterNames={spikeSortingParameterNames}
        />
      )}
      {spikeSortingJobId && spikeSortingJob && spikeSortingJob.status === "completed" && (
        <NeurosiftLink url={getJobOutputUrl(spikeSortingJob, "output")} />
      )}
    </div>
  )
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
  if (url.endsWith(".lindi") || url.endsWith(".lindi.json")) {
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

type SelectSpikeSortingOptsProps = {
  spikeSortingOpts: SpikeSortingOpts;
  setSpikeSortingOpts: (opts: SpikeSortingOpts) => void;
};

const SelectSpikeSortingOpts: FunctionComponent<SelectSpikeSortingOptsProps> = ({
  spikeSortingOpts,
  setSpikeSortingOpts,
}) => {
  return (
    <div>
      <table>
        <tbody>
          <tr>
            <td>Detect threshold:</td>
            <td>
              <InputChoices
                value={spikeSortingOpts.detect_threshold}
                choices={[5, 6, 7, 8]}
                onChange={(detectThreshold) =>
                  setSpikeSortingOpts({
                    ...spikeSortingOpts,
                    detect_threshold: detectThreshold as number,
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

type SelectPrepareDatasetOptsProps = {
  prepareDatasetOpts: PrepareDatasetOpts;
  setPrepareDatasetOpts: (opts: PrepareDatasetOpts) => void;
};

const SelectPrepareDatasetOpts: FunctionComponent<
  SelectPrepareDatasetOptsProps
> = ({ prepareDatasetOpts, setPrepareDatasetOpts }) => {
  return (
    <div>
      <table>
        <tbody>
          <tr>
            <td>Duration (minutes):</td>
            <td>
              <InputChoices
                value={
                  prepareDatasetOpts.duration_sec === 0
                    ? "full"
                    : prepareDatasetOpts.duration_sec / 60
                }
                choices={[1, 5, 20, 60, "full"]}
                onChange={(duration_min) =>
                  setPrepareDatasetOpts({
                    ...prepareDatasetOpts,
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
                value={prepareDatasetOpts.electrode_indices}
                onChange={(electrode_indices) =>
                  setPrepareDatasetOpts({
                    ...prepareDatasetOpts,
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
                value={prepareDatasetOpts.freq_min}
                choices={[300]}
                onChange={(freq_min) =>
                  setPrepareDatasetOpts({
                    ...prepareDatasetOpts,
                    freq_min: freq_min as number,
                  })
                }
              />
              -
              <InputChoices
                value={prepareDatasetOpts.freq_max}
                choices={[6000, 9000, 12000]}
                onChange={(freq_max) =>
                  setPrepareDatasetOpts({
                    ...prepareDatasetOpts,
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
                value={prepareDatasetOpts.compression_ratio}
                choices={["none", 4, 8, 12, 16, 20, 30, 40, 50, 75, 100]}
                onChange={(compressionRatio) =>
                  setPrepareDatasetOpts({
                    ...prepareDatasetOpts,
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
                value={prepareDatasetOpts.output_electrical_series_name}
                onChange={(e) =>
                  setPrepareDatasetOpts({
                    ...prepareDatasetOpts,
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

const intListToString = (v: number[]) => {
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

type InputChoicesProps = {
  value: number | string;
  choices: (number | string)[];
  onChange: (value: number | string) => void;
};

const InputChoices: FunctionComponent<InputChoicesProps> = ({
  value,
  choices,
  onChange,
}) => {
  const valFromStr = (str: string) => {
    const i = choices.map((x) => x.toString()).indexOf(str);
    if (i < 0) {
      throw Error(`Unexpected: value not found in choices: ${str}`);
    }
    return choices[i];
  };
  return (
    <select
      value={value}
      onChange={(e) => onChange(valFromStr(e.target.value))}
    >
      {choices.map((choice) => (
        <option key={choice} value={choice}>
          {choice}
        </option>
      ))}
    </select>
  );
};

export default SpikeSortingView;
