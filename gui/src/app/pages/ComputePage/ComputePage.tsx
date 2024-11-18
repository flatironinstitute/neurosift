import { Hyperlink } from "@fi-sci/misc";
import JobsView from "neurosift-lib/misc/dendro/JobsView";
import {
  JupyterConnectivityState,
  useJupyterConnectivity,
} from "neurosift-lib/pages/ChatPage/JupyterConnectivity";
import { FunctionComponent, useEffect, useMemo, useState } from "react";

type ComputePageProps = {
  width: number;
  height: number;
};

const ComputePage: FunctionComponent<ComputePageProps> = ({
  width,
  height,
}) => {
  const [dandisetId, setDandisetId] = useState<string | undefined>(
    localStorage.getItem("compute-page-dandiset-id") || undefined,
  );
  useEffect(() => {
    if (dandisetId) {
      localStorage.setItem("compute-page-dandiset-id", dandisetId);
    }
  }, [dandisetId]);
  const tags = useMemo(() => {
    return [`dandiset:${dandisetId}`];
  }, [dandisetId]);

  const jupyterConnectivityState = useJupyterConnectivity();

  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);

  return (
    <div
      style={{
        position: "absolute",
        left: 10,
        top: 10,
        width: width - 20,
        height: height - 20,
      }}
    >
      <JupyterConnectivityView
        jupyterConnectivityState={jupyterConnectivityState}
      />
      <hr />
      {selectedJobIds.length === 1 ? (
        <div>
          Run
          <hr />
        </div>
      ) : selectedJobIds.length > 1 ? (
        <div>
          You can only submit 1 job at a time
          <hr />
        </div>
      ) : (
        <span />
      )}
      <SelectDandisetComponent
        dandisetId={dandisetId}
        setDandisetId={setDandisetId}
      />
      {dandisetId && (
        <JobsView
          serviceName="neurosift"
          tags={tags}
          allowDeleteJobs={false}
          onSelectedJobIdsChanged={setSelectedJobIds}
        />
      )}
    </div>
  );
};

type JupyterConnectivityViewProps = {
  jupyterConnectivityState: JupyterConnectivityState;
};

const JupyterConnectivityView: FunctionComponent<
  JupyterConnectivityViewProps
> = ({ jupyterConnectivityState }) => {
  if (!jupyterConnectivityState.jupyterServerIsAvailable) {
    return (
      <div>
        <p>
          In order to process jobs, you must be connected to a Jupyter server
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
  return (
    <div style={{ color: "darkgreen" }}>
      You are connected to the Jupyter server at{" "}
      {jupyterConnectivityState.jupyterServerUrl}
    </div>
  );
};

type SelectDandisetComponentProps = {
  dandisetId: string | undefined;
  setDandisetId: (dandisetId: string) => void;
};

const SelectDandisetComponent: FunctionComponent<
  SelectDandisetComponentProps
> = ({ dandisetId, setDandisetId }) => {
  const [internalDandisetId, setInternalDandisetId] = useState<string>("");
  useEffect(() => {
    setInternalDandisetId(dandisetId || "");
  }, [dandisetId]);

  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      setDandisetId(internalDandisetId);
    }
  };

  return (
    <div>
      <input
        value={internalDandisetId}
        onChange={(e) => setInternalDandisetId(e.target.value)}
        onKeyPress={handleKeyPress}
      />
      <button onClick={() => setDandisetId(internalDandisetId)}>
        Select Dandiset
      </button>
    </div>
  );
};

export default ComputePage;
