import { SmallIconButton } from "@fi-sci/misc";
import { Cancel, ClearAll } from "@mui/icons-material";
import {
  FunctionComponent,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import PythonSessionClient, {
  NeurosiftFigureContent,
  PlotlyContent,
  PythonSessionOutputItem,
} from "./PythonSessionClient";
import LazyPlotlyPlot from "../../components/LazyPlotlyPlot";
import { useJupyterConnectivity } from "./JupyterConnectivity";
import NeurosiftFigure0 from "../../components/NeurosiftFigure0";

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
  #pythonSessionClient: PythonSessionClient | null = null;
  #onPythonSessionStatusChangedCallbacks: ((
    status: PythonSessionStatus,
  ) => void)[] = [];
  constructor() {}
  get pythonSessionStatus() {
    return this.#pythonSessionClient?.pythonSessionStatus ?? "uninitiated";
  }
  setPythonSessionClient(client: PythonSessionClient) {
    this.#pythonSessionClient = client;
    client.onPythonSessionStatusChanged((status) => {
      this.#onPythonSessionStatusChangedCallbacks.forEach((cb) => cb(status));
    });
  }
  removePythonSessionClient() {
    this.#pythonSessionClient = null;
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
  async runCode(
    code: string,
    {
      onStdout,
      onStderr,
      onImage,
      onFigure,
    }: {
      onStdout?: (message: string) => void;
      onStderr?: (message: string) => void;
      onImage?: (format: "png", content: string) => void;
      onFigure?: (
        a:
          | { format: "plotly"; content: PlotlyContent }
          | { format: "neurosift_figure"; content: NeurosiftFigureContent },
      ) => void;
    },
    canceler: { current: boolean },
  ) {
    if (!this.#pythonSessionClient) {
      throw new Error("Python session client not ready");
    }
    if (
      this.#pythonSessionClient.pythonSessionStatus !== "idle" &&
      this.#pythonSessionClient.pythonSessionStatus !== "uninitiated"
    ) {
      throw new Error("Python session is not idle");
    }
    const onOutputItem = (item: PythonSessionOutputItem) => {
      if (item.type === "stdout") {
        onStdout && onStdout(item.content);
      } else if (item.type === "stderr") {
        onStderr && onStderr(item.content);
      } else if (item.type === "image") {
        onImage && onImage(item.format, item.content);
      } else if (item.type === "figure") {
        onFigure &&
          onFigure({
            format: item.format as any,
            content: item.content as any,
          });
      }
    };
    this.#pythonSessionClient.onOutputItem(onOutputItem);
    try {
      await new Promise<void>((resolve, reject) => {
        let done = false;
        this.#pythonSessionClient
          ?.runCode(code)
          .then(() => {
            if (done) return;
            done = true;
            resolve();
          })
          .catch((e) => {
            if (done) return;
            done = true;
            reject(e);
          });
        const check = () => {
          if (done) return;
          if (canceler.current) {
            done = true;
            reject(new Error("Script execution cancelled"));
            return;
          }
          setTimeout(check, 100);
        };
        check();
      });
      // wait until idle
      while (
        (this.#pythonSessionClient.pythonSessionStatus as any) !== "idle"
      ) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    } finally {
      this.#pythonSessionClient.removeOnOutputItem(onOutputItem);
    }
  }
}

type OutputContent = {
  items: PythonSessionOutputItem[];
};

type OutputContentAction =
  | {
      type: "add-output-item";
      item: PythonSessionOutputItem;
    }
  | {
      type: "clear-output";
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
    case "clear-output":
      return {
        items: [],
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
  const jupyterConnectivityState = useJupyterConnectivity();
  const [outputContent, dispatchOutputContent] = useReducer(
    outputContentReducer,
    { items: [] },
  );
  const [pythonSessionClient, setPythonSessionClient] =
    useState<PythonSessionClient | null>(null);
  const bottomElementRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const x = new PythonSessionClient(jupyterConnectivityState);
    x.onOutputItem((item: PythonSessionOutputItem) => {
      dispatchOutputContent({ type: "add-output-item", item });
    });
    setPythonSessionClient(x);
    runCodeCommunicator.setPythonSessionClient(x);
    return () => {
      x.shutdown();
    };
  }, [runCodeCommunicator, jupyterConnectivityState]);
  const [pythonSessionStatus, setPythonSessionStatus] =
    useState<PythonSessionStatus>("uninitiated");
  useEffect(() => {
    setPythonSessionStatus(runCodeCommunicator.pythonSessionStatus);
    const cb = (status: PythonSessionStatus) => {
      setPythonSessionStatus(status);
    };
    runCodeCommunicator.onPythonSessionStatusChanged(cb);
    return () => {
      runCodeCommunicator.removeOnPythonSessionStatusChanged(cb);
    };
  }, [runCodeCommunicator]);

  // when a new output comes in, scroll to the bottom
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [outputContent]);

  const topBarHeight = 25;

  return (
    <div style={{ position: "absolute", width, height }}>
      <div
        style={{
          height: topBarHeight,
          backgroundColor: "lightgray",
        }}
      >
        <div style={{ paddingTop: 3 }}>
          &nbsp;Output |&nbsp;
          <span>
            {pythonSessionStatus === "idle"
              ? "ready"
              : pythonSessionStatus === "busy"
                ? "running"
                : pythonSessionStatus}
            &nbsp;|&nbsp;
          </span>
          {pythonSessionStatus === "busy" && (
            <SmallIconButton
              icon={<Cancel />}
              title="Cancel execution"
              onClick={() => {
                if (!pythonSessionClient) return;
                pythonSessionClient.cancelExecution();
              }}
            />
          )}
          &nbsp;
          <SmallIconButton
            icon={<ClearAll />}
            title="Clear output"
            onClick={() => {
              dispatchOutputContent({ type: "clear-output" });
            }}
          />
        </div>
      </div>
      <div
        ref={containerRef}
        style={{
          width,
          top: topBarHeight,
          height: height - topBarHeight,
          overflowY: "auto",
        }}
      >
        <div style={{ padding: 20 }}>
          {outputContent.items.map((item, index) => (
            <OutputItemView key={index} item={item} />
          ))}
          <div ref={bottomElementRef}>&nbsp;</div>
        </div>
      </div>
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
    } else {
      return <div>Unknown image format: {(item as any).format}</div>;
    }
  } else if (item.type === "figure") {
    if (item.format === "plotly") {
      const data = item.content.data;
      const layout = item.content.layout;
      return <LazyPlotlyPlot data={data} layout={layout} />;
    } else if (item.format === "neurosift_figure") {
      return (
        <NeurosiftFigure0
          nwb_url={item.content.nwb_url}
          item_path={item.content.item_path}
          view_plugin_name={item.content.view_plugin_name}
          height={item.content.height}
        />
      );
    } else {
      return <div>Unknown figure format: {(item as any).format}</div>;
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
