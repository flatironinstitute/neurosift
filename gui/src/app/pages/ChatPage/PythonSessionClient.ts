import { KernelManager, ServerConnection, Kernel } from "@jupyterlab/services";
import { PythonSessionStatus } from "./RunCodeWindow";

export type PlotlyContent = {
  config: {
    plotlyServerURL: string;
  };
  data: any;
  layout: any;
};

export type PythonSessionOutputItem =
  | {
      type: "stdout" | "stderr";
      content: string;
    }
  | {
      type: "image";
      format: "png";
      content: string;
    }
  | {
      type: "figure";
      format: "plotly";
      content: PlotlyContent;
    };

class PythonSessionClient {
  #onOutputItemCallbacks: ((item: PythonSessionOutputItem) => void)[] = [];
  #pythonSessionStatus: PythonSessionStatus = "uninitiated";
  #onPythonSessionStatusChangedCallbacks: ((
    status: PythonSessionStatus,
  ) => void)[] = [];
  #kernel: Kernel.IKernelConnection | undefined;
  constructor() {}
  async initiate() {
    const serverSettings = ServerConnection.makeSettings({
      baseUrl: "http://localhost:8888",
    });
    const kernelManager = new KernelManager({ serverSettings });
    const kernel = await kernelManager.startNew({
      name: "python",
    });

    kernel.statusChanged.connect((_, status) => {
      if (status === "idle") {
        this._setPythonSessionStatus("idle");
      } else if (status === "busy") {
        this._setPythonSessionStatus("busy");
      } else {
        // todo: separate this out
        this._setPythonSessionStatus("unavailable");
      }
    });
    kernel.iopubMessage.connect((_, msg) => {
      console.log("iopub", msg);
      if ("name" in msg.content) {
        if (msg.content.name === "stdout" || msg.content.name === "stderr") {
          const item: PythonSessionOutputItem = {
            type: msg.content.name,
            content: msg.content.text,
          };
          this._addOutputItem(item);
        }
      } else if ("traceback" in msg.content) {
        const item: PythonSessionOutputItem = {
          type: "stderr",
          content: msg.content.traceback.join("\n") + "\n" + msg.content.evalue,
        };
        this._addOutputItem(item);
      } else if ("data" in msg.content) {
        if ("image/png" in msg.content.data) {
          const item: PythonSessionOutputItem = {
            type: "image",
            format: "png",
            content: msg.content.data["image/png"] as string,
          };
          this._addOutputItem(item);
        } else if ("application/vnd.plotly.v1+json" in msg.content.data) {
          const item: PythonSessionOutputItem = {
            type: "figure",
            format: "plotly",
            content: msg.content.data[
              "application/vnd.plotly.v1+json"
            ] as PlotlyContent,
          };
          this._addOutputItem(item);
        }
      }
    });

    // wait until we get our first status change
    while (this.#pythonSessionStatus === "uninitiated") {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    // wait until not busy
    while (this.#pythonSessionStatus === "busy") {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    if (this.#pythonSessionStatus === "unavailable") {
      throw Error("Python session unavailable");
    } else if (this.#pythonSessionStatus === "idle") {
      this.#kernel = kernel;
    } else {
      throw Error(
        "Unexpected python session status:" + this.#pythonSessionStatus,
      );
    }
  }
  async cancelExecution() {
    if (!this.#kernel) return;
    await this.#kernel.interrupt();
  }
  async shutdown() {
    if (!this.#kernel) return;
    await this.#kernel.shutdown();
  }
  async requestRunCode(code: string) {
    if (!this.#kernel) {
      try {
        console.info("initiating python session");
        await this.initiate();
      } catch (err: any) {
        console.error("Error initiating", err);
        const errMessages = [
          "Error initiating python session. You must have a jupyter server running on http://localhost:8888 and allow access to neurosift.",
          "Run: jupyter lab --NotebookApp.allow_origin='https://neurosift.app' --no-browser",
        ];
        for (const errMessage of errMessages) {
          const item: PythonSessionOutputItem = {
            type: "stderr",
            content: errMessage,
          };
          this.#onOutputItemCallbacks.forEach((callback) => {
            callback(item);
          });
        }
        return;
      }
    }
    if (!this.#kernel) throw Error("Unexpected, no kernel");
    const future = this.#kernel.requestExecute({ code });
    const reply = await future.done;
    console.log(reply);
  }
  onOutputItem(callback: (item: PythonSessionOutputItem) => void) {
    this.#onOutputItemCallbacks.push(callback);
  }
  removeOnOutputItem(callback: (item: PythonSessionOutputItem) => void) {
    this.#onOutputItemCallbacks = this.#onOutputItemCallbacks.filter(
      (c) => c !== callback,
    );
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
  _setPythonSessionStatus(status: PythonSessionStatus) {
    this.#pythonSessionStatus = status;
    this.#onPythonSessionStatusChangedCallbacks.forEach((callback) => {
      callback(status);
    });
  }
  _addOutputItem(item: PythonSessionOutputItem) {
    this.#onOutputItemCallbacks.forEach((callback) => {
      callback(item);
    });
  }
}

export default PythonSessionClient;
