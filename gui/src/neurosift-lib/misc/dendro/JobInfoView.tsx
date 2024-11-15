import { Hyperlink, SmallIconButton } from "@fi-sci/misc";
import { Refresh } from "@mui/icons-material";
import { FunctionComponent, useCallback, useState } from "react";
import { DendroJob, DendroJobStatus } from "../../misc/dendro/dendro-types";
import { formatValue, getJobParameterValue } from "./DendroHelpers";
import ModalWindow, { useModalWindow } from "@fi-sci/modal-window";
import {
  JupyterConnectivityState,
  useJupyterConnectivity,
} from "../../pages/ChatPage/JupyterConnectivity";
import PythonSessionClient from "neurosift-lib/pages/ChatPage/PythonSessionClient";

type JobInfoViewProps = {
  job: DendroJob;
  onRefreshJob: () => void;
  parameterNames: string[];
};

const getJobUrl = (jobId: string) => {
  return `https://dendro.vercel.app/job/${jobId}`;
};

export const JobInfoView: FunctionComponent<JobInfoViewProps> = ({
  job,
  onRefreshJob,
  parameterNames,
}) => {
  const {
    visible: jobWindowVisible,
    handleOpen: openJobWindow,
    handleClose: closeJobWindow,
  } = useModalWindow();
  return (
    <div>
      <div>
        <StatusMarker status={job.status} />
        <Hyperlink
          color={colorForJobStatus(job.status)}
          onClick={openJobWindow}
        >
          job:{job.jobDefinition.processorName}
        </Hyperlink>
        <span style={{ color: colorForJobStatus(job.status) }}>
          <SmallIconButton icon={<Refresh />} onClick={onRefreshJob} />
        </span>
      </div>
      <table className="table" style={{ maxWidth: 300 }}>
        <tbody>
          {parameterNames.map((name, index) => (
            <tr key={index}>
              <td>{name}:</td>
              <td>{formatValue(getJobParameterValue(job, name))}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <ModalWindow visible={jobWindowVisible} onClose={closeJobWindow}>
        <JobWindow job={job} onClose={closeJobWindow} />
      </ModalWindow>
    </div>
  );
};

const StatusMarker: FunctionComponent<{ status: DendroJobStatus }> = ({
  status,
}) => {
  if (status === "completed") {
    return <span style={{ color: colorForJobStatus(status) }}>✓</span>;
  } else if (status === "running") {
    return <span style={{ color: colorForJobStatus(status) }}>⚙</span>;
  } else if (status === "failed") {
    return <span style={{ color: colorForJobStatus(status) }}>✗</span>;
  } else if (status === "pending") {
    return <span style={{ color: colorForJobStatus(status) }}>⌛</span>;
  } else if (status === "starting") {
    return <span style={{ color: colorForJobStatus(status) }}>▶</span>;
  } else {
    return <span style={{ color: colorForJobStatus(status) }}>?</span>;
  }
};

const colorForJobStatus = (status: DendroJobStatus) => {
  switch (status) {
    case "completed":
      return "green";
    case "running":
      return "blue";
    case "failed":
      return "red";
    case "pending":
      return "black";
    case "starting":
      return "orange";
    default:
      return "black";
  }
};

type JobWindowProps = {
  job: DendroJob;
  onClose: () => void;
};

const JobWindow: FunctionComponent<JobWindowProps> = ({ job, onClose }) => {
  const url = getJobUrl(job.jobId);
  return (
    <div>
      <RunOptions job={job} />
      <div>
        <Hyperlink href={url} target="_blank">
          View job in Dendro
        </Hyperlink>
      </div>
    </div>
  );
};

const RunOptions: FunctionComponent<{ job: DendroJob }> = ({ job }) => {
  const [showRunLocally, setShowRunLocally] = useState(false);
  if (job.status === "pending") {
    if (showRunLocally) {
      return <RunLocallyComponent job={job} />;
    } else {
      return (
        <div>
          <button onClick={() => setShowRunLocally(true)}>
            Run using local resources
          </button>
        </div>
      );
    }
  } else return <span />;
};

const RunLocallyComponent: FunctionComponent<{ job: DendroJob }> = ({
  job,
}) => {
  const jupyterConnectivityState = useJupyterConnectivity();
  const [submissionStatus, setSubmissionStatus] = useState<
    "waiting" | "submitting" | "submission-complete" | "submission-error"
  >("waiting");
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [dendroApiKey, setDendroApiKey] = useState<string>("");
  const handleSubmit = useCallback(() => {
    let canceled = false;
    const submit = async () => {
      setSubmissionStatus("submitting");
      try {
        if (!jupyterConnectivityState.jupyterServerIsAvailable) {
          throw "Not connected to jupyter server";
        }
        await doSubmitJob(job, jupyterConnectivityState, dendroApiKey);
        if (canceled) return;
        setSubmissionStatus("submission-complete");
      } catch (err: any) {
        setSubmissionStatus("submission-error");
        setSubmissionError(err.message);
      }
    };
    submit();
    return () => {
      canceled = true;
    };
  }, [job, jupyterConnectivityState, dendroApiKey]);
  if (!jupyterConnectivityState.jupyterServerIsAvailable) {
    return (
      <div style={{ padding: 30 }}>
        <p>
          In order to run this job locally, you must be connected to a Jupyter
          server
        </p>
        <p>
          There is no Jupyter server running at{" "}
          {jupyterConnectivityState.jupyterServerUrl} (
          <Hyperlink onClick={jupyterConnectivityState.changeJupyterServerUrl}>
            change this
          </Hyperlink>
          ).
        </p>
        <p>
          Run the following command to start Jupyter lab on your local machine
          on port 8888 and allow access to neurosift:
        </p>
        <div>
          <code>
            {`jupyter lab --NotebookApp.allow_origin='https://neurosift.app' --no-browser --port=8888`}
          </code>
        </div>
        <div>&nbsp;</div>
        <div>
          <button onClick={jupyterConnectivityState.refreshJupyter}>
            Refresh Jupyter connection
          </button>
        </div>
      </div>
    );
  }
  if (submissionStatus === "waiting") {
    return (
      <div>
        <p>
          You are about to submit this job to the Jupyter server at{" "}
          {jupyterConnectivityState.jupyterServerUrl}.
        </p>
        <p>
          <input
            type="text"
            value={dendroApiKey}
            onChange={(e) => setDendroApiKey(e.target.value)}
            placeholder="Dendro API key"
          />
        </p>
        <p>
          <button onClick={handleSubmit} disabled={!dendroApiKey}>
            Submit job
          </button>
        </p>
      </div>
    );
  } else if (submissionStatus === "submitting") {
    return (
      <div>
        <p>Submitting job...</p>
      </div>
    );
  } else if (submissionStatus === "submission-complete") {
    return (
      <div>
        <p>Job submitted successfully</p>
      </div>
    );
  } else if (submissionStatus === "submission-error") {
    return (
      <div style={{ color: "red" }}>
        <p>Error submitting job</p>
        <p>{submissionError}</p>
      </div>
    );
  }
};

const doSubmitJob = async (
  job: DendroJob,
  jupyterConnectivityState: JupyterConnectivityState,
  dendroApiKey: string,
) => {
  const code = `
import os
from dendro.compute_client.run_pending_job import run_pending_job

os.environ['CONTAINER_METHOD'] = 'docker'
run_pending_job(
  job_id='${job.jobId}',
  user_api_key='${dendroApiKey}',
  detach=True
)
`;
  const client = new PythonSessionClient(jupyterConnectivityState);
  const errorMessages: string[] = [];
  client.onOutputItem((item) => {
    if (item.type === "stderr") {
      console.error(`Error from Jupyter when submitting job: ${item.content}`);
      errorMessages.push(item.content);
    } else {
      console.log(`Output from Jupyter when submitting job: ${item.content}`);
    }
  });
  await client.runCode(code);
  await client.waitUntilIdle();
  if (errorMessages.length > 0) {
    throw `Error running code: ${errorMessages.join("\n")}`;
  }
};

export default JobInfoView;
