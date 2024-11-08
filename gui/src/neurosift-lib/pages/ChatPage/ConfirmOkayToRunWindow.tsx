import { Hyperlink, SmallIconButton } from "@fi-sci/misc";
import { Cancel, Check } from "@mui/icons-material";
import Markdown from "../../components/Markdown";
import { FunctionComponent } from "react";
import { useJupyterConnectivity } from "./JupyterConnectivity";

type ConfirmOkayToRunWindowProps = {
  script: string | null;
  onConfirm: () => void;
  onCancel: () => void;
};

const ConfirmOkayToRunWindow: FunctionComponent<
  ConfirmOkayToRunWindowProps
> = ({ script, onConfirm, onCancel }) => {
  const jupyterConnectivityState = useJupyterConnectivity();
  if (!jupyterConnectivityState.jupyterServerIsAvailable) {
    return (
      <div style={{ padding: 20 }}>
        <div>
          <p>
            The agent would like to run a script on your Jupyter runtime kernel,
            but you are not connected to a Jupyter runtime.
          </p>
          {jupyterConnectivityState.mode === "jupyter-server" && (
            <>
              <p>
                You are trying to connect to a Jupyter runtime at{" "}
                {jupyterConnectivityState.jupyterServerUrl} (
                <Hyperlink
                  onClick={jupyterConnectivityState.changeJupyterServerUrl}
                >
                  change this
                </Hyperlink>
                ).
              </p>
              <p>
                Run the following command to start a Jupyter runtime on your
                local machine on port 8888 and allow access to neurosift:
              </p>
              <div>
                <code>
                  {`jupyter lab --NotebookApp.allow_origin='https://neurosift.app' --no-browser --port=8888`}
                </code>
              </div>
              <div>&nbsp;</div>
            </>
          )}
          {jupyterConnectivityState.mode === "jupyterlab-extension" && (
            <p>
              You are attempting to use the neurosift-jp JupyterLab extension,
              but the kernel is not available.
            </p>
          )}
        </div>
        <div>
          <button onClick={jupyterConnectivityState.refreshJupyter}>
            Refresh
          </button>
          &nbsp;&nbsp;&nbsp;
          <button onClick={onCancel}>Cancel</button>
        </div>
      </div>
    );
  }
  return (
    <div style={{ padding: 20 }}>
      <p>
        The agent would like to run the following script on your Jupyter runtime
        kernel. Are you okay with this?
      </p>
      {jupyterConnectivityState.mode === "jupyter-server" && (
        <p>
          You are connected to a Jupyter runtime at{" "}
          {jupyterConnectivityState.jupyterServerUrl} (
          <Hyperlink onClick={jupyterConnectivityState.changeJupyterServerUrl}>
            change this
          </Hyperlink>
          ).
        </p>
      )}
      {jupyterConnectivityState.mode === "jupyterlab-extension" && (
        <p>
          You are connected to a kernel using the neurosiftp-jp JupyterLab
          extension.
        </p>
      )}
      <div>
        <SmallIconButton
          icon={<Check />}
          onClick={onConfirm}
          title="Confirm"
          label="Confirm"
        />
        &nbsp;&nbsp;&nbsp;
        <SmallIconButton
          icon={<Cancel />}
          onClick={onCancel}
          title="Cancel"
          label="Cancel"
        />
      </div>
      <div>
        <Markdown source={`\`\`\`python\n${script}\n\`\`\``} />
      </div>
    </div>
  );
};

export default ConfirmOkayToRunWindow;
