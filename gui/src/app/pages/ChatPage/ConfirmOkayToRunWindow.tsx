import { Hyperlink, SmallIconButton } from "@fi-sci/misc";
import { Cancel, Check, Refresh } from "@mui/icons-material";
import Markdown from "app/Markdown/Markdown";
import { FunctionComponent, useCallback, useEffect, useState } from "react";
import { useJupyterConnectivity } from "./JupyterConnectivity";

type ConfirmOkayToRunWindowProps = {
  script: string | null;
  onConfirm: () => void;
  onCancel: () => void;
};

const ConfirmOkayToRunWindow: FunctionComponent<
  ConfirmOkayToRunWindowProps
> = ({ script, onConfirm, onCancel }) => {
  const { jupyterIsConnected, jupyterUrl, refreshJupyter, changeJupyterUrl } =
    useJupyterConnectivity();
  if (!jupyterIsConnected) {
    return (
      <div style={{ padding: 20 }}>
        <div>
          <p>
            The agent would like to run a script on your Jupyter runtime kernel,
            but you are not connected to a Jupyter runtime.
          </p>
          <p>
            You are trying to connect to a Jupyter runtime at {jupyterUrl} (
            <Hyperlink onClick={changeJupyterUrl}>change this</Hyperlink>).
          </p>
          <p>
            Run the following command to start a Jupyter runtime on your local
            machine on port 8888 and allow access to neurosift:
          </p>
          <div>
            <code>
              {`jupyter lab --NotebookApp.allow_origin='https://neurosift.app' --no-browser --port=8888`}
            </code>
          </div>
        </div>
        <div>
          <button onClick={refreshJupyter}>Refresh</button>
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
      <p>
        You are connected to a Jupyter runtime at {jupyterUrl} (
        <Hyperlink onClick={changeJupyterUrl}>change this</Hyperlink>).
      </p>
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
