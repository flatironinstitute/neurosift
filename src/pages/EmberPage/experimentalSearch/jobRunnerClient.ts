import PubNub from "pubnub";

interface JobMessage {
  jobId: string;
  script: string;
}

interface JobResponse {
  jobId: string;
  status: "accepted" | "rejected" | "completed" | "error";
  error?: string;
  output?: string;
  part?: number;
  totalParts?: number;
}

export class JobRunnerClient {
  private pubnub: PubNub;
  private jobChannel: string;
  private responseChannel: string;
  private pendingJobs = new Map<
    string,
    {
      resolve: (value: string) => void;
      reject: (error: Error) => void;
      onAccepted?: () => void;
    }
  >();
  private partialResponses = new Map<string, Map<number, string>>();
  private systemMessage: string | undefined = undefined;
  private onStatusChangeCallbacks: Array<() => void> = [];

  constructor() {
    const subscribeKey = import.meta.env.VITE_PUBNUB_SUBSCRIBE_KEY;
    const publishKey = import.meta.env.VITE_PUBNUB_PUBLISH_KEY;
    this.jobChannel = "dandi-index-query-job-requests";
    this.responseChannel = "dandi-index-query-job-responses";

    if (!subscribeKey || !publishKey) {
      throw new Error(
        "PubNub configuration missing. Please check your .env file.",
      );
    }

    this.pubnub = new PubNub({
      subscribeKey,
      publishKey,
      userId: `web-client`,
    });

    // Create subscription to response channel
    const responseSubscription = this.pubnub
      .channel(this.responseChannel)
      .subscription();
    responseSubscription.onMessage = (messageEvent) => {
      const response = messageEvent.message;
      if (this.isValidJobResponse(response)) {
        this.handleJobResponse(response);
      } else if (this.isValidProbeResponse(response)) {
        this.handleProbeResponse(response);
      }
    };
    responseSubscription.subscribe();

    // send initial probe message
    this.pubnub
      .publish({
        channel: this.jobChannel,
        message: {
          type: "probe",
        },
      })
      .catch((error) => {
        console.error("Failed to send probe message:", error);
      });
  }

  private isValidProbeResponse(response: unknown): response is {
    type: "probe-response";
    status: "alive";
    systemMessage: string;
  } {
    if (typeof response !== "object" || response === null) {
      return false;
    }
    const { type, status, systemMessage } = response as {
      type: string;
      status: string;
      systemMessage: string;
    };
    return (
      type === "probe-response" &&
      status === "alive" &&
      typeof systemMessage === "string"
    );
  }

  private handleProbeResponse(response: {
    type: "probe-response";
    status: "alive";
    systemMessage: string;
  }) {
    if (this.systemMessage) {
      // already initialized
      return;
    }
    this.systemMessage = response.systemMessage;
    console.info("Received probe response:", response);
    this.onStatusChangeCallbacks.forEach((callback) => callback());
  }

  public isAlive(): boolean {
    return this.systemMessage !== undefined;
  }

  public onStatusChange(callback: () => void) {
    this.onStatusChangeCallbacks.push(callback);
  }

  private isValidJobResponse(response: unknown): response is JobResponse {
    if (typeof response !== "object" || response === null) {
      return false;
    }
    const { jobId, status } = response as JobResponse;
    return (
      typeof jobId === "string" &&
      ["accepted", "rejected", "completed", "error"].includes(status)
    );
  }

  private async handleJobResponse(response: JobResponse) {
    const pendingJob = this.pendingJobs.get(response.jobId);
    if (!pendingJob) {
      console.warn("Received response for unknown job:", response.jobId);
      return;
    }

    switch (response.status) {
      case "accepted":
        if (pendingJob.onAccepted) pendingJob.onAccepted();
        break;
      case "completed":
        if (response.part === undefined || response.totalParts === undefined) {
          // Handle single-part response
          this.pendingJobs.delete(response.jobId);
          pendingJob.resolve(response.output || "no output");
        } else {
          // Handle multi-part response
          let partsMap = this.partialResponses.get(response.jobId);
          if (!partsMap) {
            partsMap = new Map<number, string>();
            this.partialResponses.set(response.jobId, partsMap);
          }
          partsMap.set(response.part, response.output || "");

          // Check if we have all parts
          if (partsMap.size === response.totalParts) {
            // Combine all parts in order
            const combinedOutput = Array.from(
              { length: response.totalParts },
              (_, i) => partsMap?.get(i + 1) || "",
            ).join("");

            this.pendingJobs.delete(response.jobId);
            this.partialResponses.delete(response.jobId);
            pendingJob.resolve(combinedOutput || "no output");
          }
        }
        break;
      case "rejected":
      case "error":
        this.pendingJobs.delete(response.jobId);
        this.partialResponses.delete(response.jobId);
        pendingJob.reject(new Error(response.error || "Job failed"));
        break;
    }
  }

  async executeScript(script: string): Promise<string> {
    const jobId = Math.random().toString(36).slice(2);
    const jobMessage: JobMessage = {
      jobId,
      script,
    };

    return new Promise((resolve, reject) => {
      let acceptedReceived = false;
      let timeoutId: NodeJS.Timeout | undefined = undefined;

      const onAccepted = () => {
        acceptedReceived = true;
        if (timeoutId) clearTimeout(timeoutId);
      };

      timeoutId = setTimeout(() => {
        if (!acceptedReceived) {
          this.pendingJobs.delete(jobId);
          reject(
            new Error(
              "Failed to submit script. The job runner is probably offline.",
            ),
          );
        }
      }, 10000);

      this.pendingJobs.set(jobId, {
        resolve,
        reject,
        onAccepted,
      });

      this.pubnub
        .publish({
          channel: this.jobChannel,
          message: {
            ...jobMessage,
            type: "job", // Add a type field to make it a valid key-value payload
          },
        })
        .catch((error) => {
          this.pendingJobs.delete(jobId);
          reject(new Error(`Failed to submit job: ${error.message}`));
        });
    });
  }

  dispose() {
    const responseSubscription = this.pubnub
      .channel(this.responseChannel)
      .subscription();
    responseSubscription.unsubscribe();
    this.pubnub.stop();
  }
}
