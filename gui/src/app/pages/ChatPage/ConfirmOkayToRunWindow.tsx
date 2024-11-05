import { SmallIconButton } from "@fi-sci/misc";
import { Cancel, Check, Refresh } from "@mui/icons-material";
import Markdown from "app/Markdown/Markdown";
import { FunctionComponent, useCallback, useEffect, useState } from "react";

type ConfirmOkayToRunWindowProps = {
  script: string | null;
  onConfirm: () => void;
  onCancel: () => void;
};

const ConfirmOkayToRunWindow: FunctionComponent<
  ConfirmOkayToRunWindowProps
> = ({ script, onConfirm, onCancel }) => {
  return (
    <div style={{ padding: 20 }}>
      <p>
        The agent would like to run the following script on your Jupyter runtime
        kernel. Are you okay with this?
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
        <JupyterConnectivityCheck />
      </div>
      <div>
        <Markdown source={`\`\`\`python\n${script}\n\`\`\``} />
      </div>
    </div>
  );
};

const JUPYTER_PORT = 8888;

const JupyterConnectivityCheck: FunctionComponent = () => {
  const { isConnected, refresh } = useJupyterConnectivity();
  if (isConnected) {
    return (
      <span style={{ color: "darkgreen" }}>
        Connected to Jupyter runtime on port {JUPYTER_PORT}
      </span>
    );
  } else {
    return (
      <>
        <div style={{ color: "darkred" }}>
          Not connected to Jupyter runtime on port {JUPYTER_PORT}. Use the
          following command to start one:{" "}
          <code>
            {
              "jupyter lab --NotebookApp.allow_origin='https://neurosift.app' --no-browser"
            }
          </code>
        </div>
        <div>
          <SmallIconButton
            icon={<Refresh />}
            onClick={refresh}
            title="Refresh"
            label="Refresh"
          />
        </div>
      </>
    );
  }
};

const useJupyterConnectivity = () => {
  const [isConnected, setIsConnected] = useState(false);
  const check = useCallback(async () => {
    try {
      const resp = await fetch(`http://localhost:${JUPYTER_PORT}/api/sessions`);
      if (resp.ok) {
        setIsConnected(true);
      } else {
        setIsConnected(false);
      }
    } catch {
      setIsConnected(false);
    }
  }, []);
  const [refreshCode, setRefreshCode] = useState(0);
  useEffect(() => {
    check();
  }, [check, refreshCode]);
  return {
    isConnected,
    refresh: () => setRefreshCode((c) => c + 1),
  };
};

export default ConfirmOkayToRunWindow;
