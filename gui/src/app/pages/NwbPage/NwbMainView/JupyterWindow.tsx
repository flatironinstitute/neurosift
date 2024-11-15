import { Hyperlink } from "@fi-sci/misc";
import {
  JupyterConnectivityProvider,
  JupyterConnectivityState,
  useJupyterConnectivity,
} from "neurosift-lib/pages/ChatPage/JupyterConnectivity";
import PythonSessionClient from "neurosift-lib/pages/ChatPage/PythonSessionClient";
import { FunctionComponent, useEffect, useState } from "react";

type JupyterWindowProps = {
  width: number;
  height: number;
  workspacePath: string;
  workspaceName: string;
};

const JupyterWindow: FunctionComponent<JupyterWindowProps> = ({
  width,
  height,
  workspacePath,
  workspaceName,
}) => {
  return (
    <JupyterConnectivityProvider mode="jupyter-server">
      <JupyterWindowChild
        width={width}
        height={height}
        workspaceName={workspaceName}
        workspacePath={workspacePath}
      />
    </JupyterConnectivityProvider>
  );
};

const JupyterWindowChild: FunctionComponent<JupyterWindowProps> = ({
  width,
  height,
  workspaceName,
  workspacePath,
}) => {
  const jupyterConnectivityState = useJupyterConnectivity();
  if (!jupyterConnectivityState.jupyterServerIsAvailable) {
    return (
      <div style={{ padding: 30 }}>
        <p>
          There is no Jupyter lab server running at{" "}
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
            Refresh
          </button>
        </div>
      </div>
    );
  }
  return (
    <JupyterWindowChild2
      width={width}
      height={height}
      workspaceName={workspaceName}
      workspacePath={workspacePath}
    />
  );
};

const JupyterWindowChild2: FunctionComponent<JupyterWindowProps> = ({
  width,
  height,
  workspaceName,
  workspacePath,
}) => {
  const [status, setStatus] = useState<"preparing" | "ready" | "error">(
    "preparing",
  );
  const [error, setError] = useState<string | null>(null);
  const jupyterConnectivityState = useJupyterConnectivity();
  const url = jupyterConnectivityState.jupyterServerUrl;

  const iframeUrl = `${url}/lab/workspaces/${workspaceName}/tree/${workspacePath}`;

  useEffect(() => {
    let canceled = false;
    setStatus("preparing");
    setError(null);
    const prepare = async () => {
      try {
        await prepareWorkspace(jupyterConnectivityState, workspacePath);
        if (canceled) {
          return;
        }
        setStatus("ready");
      } catch (error: any) {
        if (canceled) {
          return;
        }
        setStatus("error");
        setError(error.message);
      }
    };
    prepare();
    return () => {
      canceled = true;
    };
  }, [workspacePath, jupyterConnectivityState]);

  if (status === "error") {
    return (
      <div style={{ padding: 30 }}>
        <p>There was an error preparing the workspace.</p>
        <p>{error}</p>
      </div>
    );
  }
  if (status === "preparing") {
    return (
      <div style={{ padding: 30 }}>
        <p>Preparing workspace...</p>
      </div>
    );
  }
  return <iframe src={iframeUrl} style={{ width, height, border: 0 }} />;
};

const prepareWorkspace = async (
  jupyterConnectivityState: JupyterConnectivityState,
  workspacePath: string,
) => {
  const client = new PythonSessionClient(jupyterConnectivityState);
  client.onOutputItem((item) => {
    if (item.type === "stderr") {
      console.error(
        `Error from Jupyter when preparing workspace: ${item.content}`,
      );
    } else {
      console.log(
        `Output from Jupyter when preparing workspace: ${item.content}`,
      );
    }
  });
  await client.runCode(`
import os
if not os.path.exists("${workspacePath}"):
    os.makedirs("${workspacePath}")
`);
  await client.waitUntilIdle();
};

export default JupyterWindow;
