import { Hyperlink, SmallIconButton } from "@fi-sci/misc";
import { Refresh } from "@mui/icons-material";
import {
  FunctionComponent,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from "react";
import {
  CreateJobRequest,
  PairioJob,
  PairioJobDefinition,
  PairioJobRequiredResources,
  isCreateJobResponse,
} from "../../../../pairio/types";
import {
  AllJobsView,
  MultipleChoiceNumberSelector,
  MultipleChoiceStringSelector,
  SelectPairioApiKeyComponent,
  SelectPairioComputeClientIdComponent,
  getJobParameterValue,
  useAllJobs,
  useJob,
  usePairioApiKey,
} from "./PairioHelpers";
import { RemoteH5FileX } from "@remote-h5-file/index";
import { useNwbFile } from "../../NwbFileContext";
import { LazyPlotlyPlotContext } from "./LazyPlotlyPlot";

type AdjustableParameterValues = { [key: string]: any };

type AdjustableParametersAction = { type: "set"; key: string; value: any };

const adjustableParametersReducer = (
  state: AdjustableParameterValues,
  action: AdjustableParametersAction,
): AdjustableParameterValues => {
  switch (action.type) {
    case "set": {
      return {
        ...state,
        [action.key]: action.value,
      };
    }
    default: {
      throw Error(`Unexpected action type: ${action}`);
    }
  }
};

type PairioItemViewProps = {
  width: number;
  height: number;
  nwbUrl: string;
  path: string;
  serviceName: string;
  appName?: string;
  processorName?: string;
  tags?: string[];
  title: string;
  adjustableParameters: {
    name: string;
    type: "number" | "string";
    choices: any[];
  }[];
  defaultAdjustableParameters: AdjustableParameterValues;
  getJobDefinition: (
    adjustableParameterValues: AdjustableParameterValues,
    inputFileUrl: string,
    path: string,
  ) => PairioJobDefinition;
  getRequiredResources: (requireGpu: boolean) => PairioJobRequiredResources;
  gpuMode: "optional" | "required" | "forbidden";
  OutputComponent: FunctionComponent<{
    job: PairioJob;
    width: number;
    nwbFile: RemoteH5FileX;
  }>;
  compact?: boolean;
  jobFilter?: (job: PairioJob) => boolean;
  sortCandidateJobs?: (jobs: PairioJob[]) => PairioJob[];
};

const lazyPlotlyPlotContextValue = {
  showPlotEvenWhenNotVisible: true,
};

const PairioItemView: FunctionComponent<PairioItemViewProps> = ({
  width,
  height,
  nwbUrl,
  path,
  serviceName,
  appName,
  processorName,
  tags,
  title,
  adjustableParameters,
  defaultAdjustableParameters,
  getJobDefinition,
  getRequiredResources,
  gpuMode,
  OutputComponent,
  compact,
  jobFilter,
  sortCandidateJobs,
}) => {
  const [selectedJobId, setSelectedJobId] = useState<string | undefined>(
    undefined,
  );
  const { job: selectedJob, refreshJob: refreshSelectedJob } = useJob(
    selectedJobId || undefined,
  );

  const [errorText, setErrorText] = useState<string | undefined>(undefined);

  const inputFileUrl = nwbUrl;

  const nwbFile = useNwbFile();

  // new job definition parameters
  const [adjustableParameterValues, adjustableParameterValuesDispatch] =
    useReducer(adjustableParametersReducer, defaultAdjustableParameters);

  const [requireGpu, setRequireGpu] = useState(false);
  useEffect(() => {
    if (gpuMode === "required") {
      setRequireGpu(true);
    } else if (gpuMode === "forbidden") {
      setRequireGpu(false);
    }
  }, [gpuMode]);

  useEffect(() => {
    // if we have a new selected job, update the parameters
    if (!selectedJob) return;
    for (const p of adjustableParameters) {
      const value = getJobParameterValue(selectedJob, p.name);
      if (value !== undefined) {
        adjustableParameterValuesDispatch({ type: "set", key: p.name, value });
      }
    }
  }, [selectedJob, adjustableParameterValuesDispatch, adjustableParameters]);

  const [submittingNewJob, setSubmittingNewJob] = useState(false);
  const [definingNewJob, setDefiningNewJob] = useState(false);
  const newJobDefinition: PairioJobDefinition | undefined = useMemo(
    () =>
      nwbUrl
        ? getJobDefinition(adjustableParameterValues, inputFileUrl, path)
        : undefined,
    [nwbUrl, inputFileUrl, adjustableParameterValues, path, getJobDefinition],
  );
  useEffect(() => {
    // if the job definition has changed, close up the submission
    setSubmittingNewJob(false);
  }, [newJobDefinition]);

  const requiredResources: PairioJobRequiredResources = useMemo(() => {
    return getRequiredResources(requireGpu);
  }, [requireGpu, getRequiredResources]);

  // do not include service when we are finding all jobs
  const { allJobs, refreshAllJobs } = useAllJobs({
    appName,
    processorName,
    inputFileUrl,
    tags,
    jobFilter,
  });
  useEffect(() => {
    if (!allJobs) return;
    if (allJobs.length === 0) {
      setDefiningNewJob(true);
    }
  }, [allJobs]);

  useEffect(() => {
    if (selectedJobId) return;
    for (const ss of ["completed", "running", "pending", "failed"]) {
      let candidateJobs = allJobs?.filter((job) => job.status === ss);
      if (candidateJobs) {
        if (sortCandidateJobs) {
          candidateJobs = sortCandidateJobs(candidateJobs);
        }
        if (candidateJobs && candidateJobs.length > 0) {
          setSelectedJobId(candidateJobs[0].jobId);
          return;
        }
      }
    }
  }, [allJobs, selectedJobId, sortCandidateJobs]);

  const { pairioApiKey, setPairioApiKey } = usePairioApiKey();
  const [computeClientId, setComputeClientId] = useState<string | undefined>(
    undefined,
  );

  const parameterNames = useMemo(
    () => adjustableParameters.map((p) => p.name),
    [adjustableParameters],
  );

  const handleSubmitNewJob = useCallback(async () => {
    if (!newJobDefinition) return;
    setErrorText(undefined);
    try {
      const req: CreateJobRequest = {
        type: "createJobRequest",
        serviceName,
        userId: "",
        batchId: "",
        tags: tags ? tags : ["neurosift"],
        jobDefinition: newJobDefinition,
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
      setDefiningNewJob(false);
      setSelectedJobId(rr.job.jobId);
      refreshAllJobs();
      refreshSelectedJob();
    } catch (err: any) {
      setErrorText(err.message);
    }
  }, [
    newJobDefinition,
    pairioApiKey,
    computeClientId,
    refreshAllJobs,
    refreshSelectedJob,
    requiredResources,
    serviceName,
    tags,
  ]);

  const hasNoCompletedJobs = useMemo(() => {
    if (!allJobs) return false;
    return allJobs.filter((job) => job.status === "completed").length === 0;
  }, [allJobs]);

  return (
    <LazyPlotlyPlotContext.Provider value={lazyPlotlyPlotContextValue}>
      <div
        style={{
          position: "relative",
          width,
          height: height || undefined,
          overflowY: "auto",
        }}
      >
        {!compact && (
          <>
            <h3>{title}</h3>
            {definingNewJob ? (
              <div>
                <table className="table" style={{ maxWidth: 300 }}>
                  <tbody>
                    {adjustableParameters.map((p) => (
                      <tr key={p.name}>
                        <td>{p.name}:</td>
                        <td>
                          {p.type === "number" ? (
                            <MultipleChoiceNumberSelector
                              value={adjustableParameterValues[p.name]}
                              setValue={(x) =>
                                adjustableParameterValuesDispatch({
                                  type: "set",
                                  key: p.name,
                                  value: x,
                                })
                              }
                              choices={p.choices}
                            />
                          ) : p.type === "string" ? (
                            <MultipleChoiceStringSelector
                              value={adjustableParameterValues[p.name]}
                              setValue={(x) =>
                                adjustableParameterValuesDispatch({
                                  type: "set",
                                  key: p.name,
                                  value: x,
                                })
                              }
                              choices={p.choices}
                            />
                          ) : (
                            <span />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!submittingNewJob && (
                  <div style={{ paddingTop: 10 }}>
                    <button onClick={() => setSubmittingNewJob(true)}>
                      SUBMIT JOB
                    </button>
                  </div>
                )}
                {submittingNewJob && (
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
                    {gpuMode === "optional" && (
                      <div style={{ paddingTop: 10 }}>
                        <RequireGpuSelector
                          value={requireGpu}
                          setValue={setRequireGpu}
                        />
                      </div>
                    )}
                    <div style={{ paddingTop: 10 }}>
                      <button
                        onClick={handleSubmitNewJob}
                        disabled={!pairioApiKey}
                      >
                        SUBMIT JOB
                      </button>
                    </div>
                  </div>
                )}
                <hr />
              </div>
            ) : (
              <div>
                <Hyperlink onClick={() => setDefiningNewJob(true)}>
                  Create new job
                </Hyperlink>
              </div>
            )}
            {errorText && <div style={{ color: "red" }}>{errorText}</div>}
            <AllJobsView
              allJobs={allJobs || undefined}
              refreshAllJobs={refreshAllJobs}
              selectedJobId={selectedJobId}
              onJobClicked={setSelectedJobId}
              parameterNames={parameterNames}
            />
            <hr />
          </>
        )}
        {selectedJob && (
          <div>
            {!compact && (
              <JobInfoView
                job={selectedJob}
                onRefreshJob={() => {
                  refreshAllJobs();
                  refreshSelectedJob();
                }}
                parameterNames={parameterNames}
              />
            )}
            <div>&nbsp;</div>
            {selectedJob && selectedJob.status === "completed" && (
              <OutputComponent
                job={selectedJob}
                width={width}
                nwbFile={nwbFile}
              />
            )}
          </div>
        )}
        {hasNoCompletedJobs && (
          <div>
            <div>No completed jobs</div>
          </div>
        )}
        <hr />
      </div>
    </LazyPlotlyPlotContext.Provider>
  );
};

const RequireGpuSelector: FunctionComponent<{
  value: boolean;
  setValue: (value: boolean) => void;
}> = ({ value, setValue }) => {
  return (
    <div>
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => setValue(e.target.checked)}
      />
      <label>Require GPU</label>
    </div>
  );
};

type JobInfoViewProps = {
  job: PairioJob;
  onRefreshJob: () => void;
  parameterNames: string[];
};

const getJobUrl = (jobId: string) => {
  return `https://pairio.vercel.app/job/${jobId}`;
};

export const JobInfoView: FunctionComponent<JobInfoViewProps> = ({
  job,
  onRefreshJob,
  parameterNames,
}) => {
  const jobUrl = getJobUrl(job.jobId);
  return (
    <div>
      <Hyperlink href={jobUrl} target="_blank">
        Job {job.status}
      </Hyperlink>
      &nbsp;
      <SmallIconButton icon={<Refresh />} onClick={onRefreshJob} />
      <table className="table" style={{ maxWidth: 300 }}>
        <tbody>
          {parameterNames.map((name, index) => (
            <tr key={index}>
              <td>{name}:</td>
              <td>{getJobParameterValue(job, name)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PairioItemView;
