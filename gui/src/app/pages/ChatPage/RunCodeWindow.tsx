import {
  FunctionComponent,
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import PythonSessionClient, {
  PythonSessionOutputItem,
} from "./PythonSessionClient";

type RunCodeWindowProps = {
  width: number;
  height: number;
  runCodeCommunicator: RunCodeCommunicator;
};

export type PythonSessionStatus =
  | "idle"
  | "busy"
  | "unavailable"
  | "uninitiated";

export class RunCodeCommunicator {
  #onRunCodeCallbacks: ((code: string) => void)[] = [];
  #pythonSessionStatus: PythonSessionStatus = "unavailable";
  #onPythonSessionStatusChangedCallbacks: ((
    status: PythonSessionStatus,
  ) => void)[] = [];
  constructor() {}
  setPythonSessionStatus(status: PythonSessionStatus) {
    this.#pythonSessionStatus = status;
    for (const callback of this.#onPythonSessionStatusChangedCallbacks) {
      callback(status);
    }
  }
  get pythonSessionStatus() {
    return this.#pythonSessionStatus;
  }
  onPythonSessionStatusChanged(
    callback: (status: PythonSessionStatus) => void,
  ) {
    this.#onPythonSessionStatusChangedCallbacks.push(callback);
  }
  removeOnPythonSessionStatusChanged(
    callback: (status: PythonSessionStatus) => void,
  ) {
    this.#onPythonSessionStatusChangedCallbacks =
      this.#onPythonSessionStatusChangedCallbacks.filter((c) => c !== callback);
  }
  onRunCode(callback: (code: string) => void) {
    this.#onRunCodeCallbacks.push(callback);
  }
  removeOnRunCode(callback: (code: string) => void) {
    this.#onRunCodeCallbacks = this.#onRunCodeCallbacks.filter(
      (c) => c !== callback,
    );
  }
  async runCode(code: string) {
    for (const callback of this.#onRunCodeCallbacks) {
      callback(code);
    }
  }
}

type OutputContent = {
  items: PythonSessionOutputItem[];
};

type OutputContentAction = {
  type: "add-output-item";
  item: PythonSessionOutputItem;
};

const outputContentReducer = (
  state: OutputContent,
  action: OutputContentAction,
): OutputContent => {
  switch (action.type) {
    case "add-output-item":
      return {
        ...state,
        items: [...state.items, action.item],
      };
    default:
      return state;
  }
};

const RunCodeWindow: FunctionComponent<RunCodeWindowProps> = ({
  width,
  height,
  runCodeCommunicator,
}) => {
  const [outputContent, dispatchOutputContent] = useReducer(
    outputContentReducer,
    { items: [] },
  );
  const [pythonSessionClient, setPythonSessionClient] =
    useState<PythonSessionClient | null>(null);
  const bottomElementRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const x = new PythonSessionClient();
    x.onOutputItem((item: PythonSessionOutputItem) => {
      dispatchOutputContent({ type: "add-output-item", item });
    });
    x.onPythonSessionStatusChanged((status: PythonSessionStatus) => {
      runCodeCommunicator.setPythonSessionStatus(status);
    });
    setPythonSessionClient(x);
    runCodeCommunicator.setPythonSessionStatus(x.pythonSessionStatus);
    return () => {
      x.shutdown();
    };
  }, [runCodeCommunicator]);
  const handleRunCode = useCallback(
    async (code: string) => {
      if (!pythonSessionClient) {
        console.warn("Python session client not ready");
        return;
      }
      await pythonSessionClient.requestRunCode(code);
    },
    [pythonSessionClient],
  );
  useEffect(() => {
    const callback = (code: string) => {
      handleRunCode(code);
    };
    runCodeCommunicator.onRunCode(callback);
    return () => {
      runCodeCommunicator.removeOnRunCode(callback);
    };
  }, [runCodeCommunicator, handleRunCode]);

  // when a new output comes in, scroll to the bottom
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [outputContent]);

  return (
    <div
      ref={containerRef}
      style={{ width, height, padding: 12, overflowY: "auto" }}
    >
      <h2>Python output</h2>
      {outputContent.items.map((item, index) => (
        <OutputItemView key={index} item={item} />
      ))}
      <div ref={bottomElementRef}>&nbsp;</div>
    </div>
  );
};

type OutputItemViewProps = {
  item: PythonSessionOutputItem;
};

const OutputItemView: FunctionComponent<OutputItemViewProps> = ({ item }) => {
  if (item.type === "image") {
    if (item.format === "png") {
      return <img src={`data:image/png;base64,${item.content}`} />;
    }
  } else {
    return (
      <div
        style={{
          whiteSpace: "pre-wrap",
          fontFamily: "monospace",
          color: item.type === "stderr" ? "red" : "black",
        }}
      >
        {item.content}
      </div>
    );
  }
};

export default RunCodeWindow;
