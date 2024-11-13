import {
  FunctionComponent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  CreateJobRequest,
  DendroJob,
  DendroJobDefinition,
  DendroJobRequiredResources,
  isCreateJobResponse,
} from "../../misc/dendro/dendro-types";
import { useNwbFile } from "../../misc/NwbFileContext";
import {
  createDendroJobSecrets,
  isStagingUrl,
} from "../ElectricalSeriesItemView/SpikeSortingView/SpikeSortingView";
import {
  SelectDendroApiKeyComponent,
  useAllJobs,
} from "../CEBRA/DendroHelpers";
import { JobInfoView } from "../CEBRA/DendroItemView";

type TwoPhotonMovieViewProps = {
  width: number;
  height: number;
  path: string;
};

const TwoPhotonMovieView: FunctionComponent<TwoPhotonMovieViewProps> = ({
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

  const { mp4Url, job, incompleteJob, refreshAllJobs, submitJob } =
    useMp4UrlForImageSeries(nwbUrl, path);

  const leftAreaWidth = Math.min(Math.max(200, width * 0.2), 300);

  return (
    <div style={{ position: "absolute", width, height, overflow: "hidden" }}>
      <div
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
        style={{
          position: "absolute",
          left: leftAreaWidth,
          width: width - leftAreaWidth,
          height,
          overflow: "hidden",
        }}
      >
        {mp4Url && (
          <video controls width={width - leftAreaWidth} height={height}>
            <source src={mp4Url} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        )}
      </div>
    </div>
  );
};

const useMp4UrlForImageSeries = (
  nwbUrl: string,
  path: string,
): {
  mp4Url: string | undefined;
  job: DendroJob | undefined | null; // undefined means loading, null means not found
  incompleteJob: DendroJob | undefined | null; // undefined means loading, null means not found (or not relevant)
  refreshAllJobs: () => void;
  submitJob: (dendroApiKey: string, durationSec: number) => void;
} => {
  const tags = useMemo(() => ["neurosift", "image_series_to_mp4"], []);
  const { allJobs, refreshAllJobs } = useAllJobs({
    tags,
    inputFileUrl: nwbUrl,
  });
  const { job, incompleteJob } = useMemo(() => {
    if (!allJobs) return { job: undefined, incompleteJob: undefined };
    // find the job with the largest duration_sec parameter
    const jobsWithDurations: { job: DendroJob; duration_sec: number }[] =
      allJobs.map((j) => {
        const aa = j.jobDefinition.parameters.find(
          (p) => p.name === "duration_sec",
        );
        if (!aa) return { job: j, duration_sec: 0 };
        if (typeof aa.value !== "number") return { job: j, duration_sec: 0 };
        return { job: j, duration_sec: aa.value };
      });
    // sort jobs by duration_sec in descending order
    const sortedJobsWithDurations = jobsWithDurations.sort(
      (a, b) => b.duration_sec - a.duration_sec,
    );

    // job is the longest duration job that is completed
    // incompleteJob is the longest duration job that is not completed, as long as it has a duration longer than job
    let job: DendroJob | null = null;
    let incompleteJob: DendroJob | null = null;
    for (const j of sortedJobsWithDurations) {
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
  const mp4Url = useMemo(() => {
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
    async (dendroApiKey: string, durationSec: number) => {
      const jobDefinition: DendroJobDefinition = {
        appName: "hello_neurosift",
        processorName: "image_series_to_mp4",
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
            fileBaseName: "output.mp4",
          },
        ],
        parameters: [
          {
            name: "image_series_path",
            value: path,
          },
          {
            name: "duration_sec",
            value: durationSec,
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
    [nwbUrl, refreshAllJobs, tags, path, inputFileBaseName],
  );
  return { mp4Url, job, incompleteJob, refreshAllJobs, submitJob };
};

type LeftAreaProps = {
  width: number;
  height: number;
  job: DendroJob | undefined | null; // undefined means loading, null means not found
  incompleteJob: DendroJob | undefined | null; // undefined means loading, null means not found (or not relevant)
  onRefreshJob: () => void;
  submitJob: (dendroApiKey: string, durationSec: number) => void;
};

const durationSecForJob = (job: DendroJob) => {
  const aa = job.jobDefinition.parameters.find(
    (p) => p.name === "duration_sec",
  );
  if (!aa) return 0;
  if (typeof aa.value !== "number") return 0;
  return aa.value;
};

const totalDurationForJob = async (job: DendroJob) => {
  const infoOutput = job.outputFileResults.find((o) => o.name === "info");
  if (!infoOutput) return undefined;
  if (!infoOutput.url) return undefined;
  const infoJson = await fetchJson(infoOutput.url);
  if (!infoJson) return undefined;
  const duration_sec = infoJson.total_duration_sec;
  if (typeof duration_sec !== "number") return undefined;
  return duration_sec;
};

const useTotalDurationForJob = (job: DendroJob | undefined | null) => {
  const [totalDuration, setTotalDuration] = useState<number | undefined>(
    undefined,
  );
  useEffect(() => {
    if (!job) return;
    totalDurationForJob(job).then((d) => {
      setTotalDuration(d);
    });
  }, [job]);
  return totalDuration;
};

const formatMinutes = (durationSec: number | undefined) => {
  if (durationSec === undefined) return "unknown";
  const min = Math.floor(durationSec / 60);
  const sec = Math.floor(durationSec) % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
};

const fetchJson = async (url: string) => {
  const resp = await fetch(url);
  if (!resp.ok) return undefined;
  return await resp.json();
};

const LeftArea: FunctionComponent<LeftAreaProps> = ({
  job,
  incompleteJob,
  onRefreshJob,
  submitJob,
}) => {
  const [submittingNewJob, setSubmittingNewJob] = useState(false);
  const [dendroApiKey, setDendroApiKey] = useState("");
  const [selectedDurationSec, setSelectedDurationSec] = useState(60);
  const totalDuration = useTotalDurationForJob(job);
  return (
    <div>
      {job && !submittingNewJob && (
        <div style={{ padding: 3 }}>
          <p>
            Showing first {formatMinutes(durationSecForJob(job))} minutes of
            video
          </p>
          <p>Total duration: {formatMinutes(totalDuration)} minutes</p>
        </div>
      )}
      <hr />
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
          <SelectDurationSecComponent
            value={selectedDurationSec}
            setValue={setSelectedDurationSec}
          />
          <SelectDendroApiKeyComponent
            value={dendroApiKey}
            setValue={setDendroApiKey}
          />
        </div>
      )}
      {submittingNewJob && (
        <button
          onClick={() => {
            submitJob(dendroApiKey, selectedDurationSec);
            setSubmittingNewJob(false);
          }}
        >
          Submit
        </button>
      )}
      <hr />
      {incompleteJob && (
        <div style={{ padding: 3 }}>
          <p>
            Incomplete job ({formatMinutes(durationSecForJob(incompleteJob))}{" "}
            minutes):
          </p>
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

type SelectDurationSecComponentProps = {
  value: number;
  setValue: (value: number) => void;
};

const durationMinutesChoices = [1, 3, 10, 30, 60];

const SelectDurationSecComponent: FunctionComponent<
  SelectDurationSecComponentProps
> = ({ value, setValue }) => {
  return (
    <div>
      <label>Duration (minutes):</label>
      <select
        value={value / 60}
        onChange={(e) => setValue(parseInt(e.target.value) * 60)}
      >
        {durationMinutesChoices.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>
    </div>
  );
};

export default TwoPhotonMovieView;
