import { SpectrogramInput, SpectrogramResult } from "./WorkerTypes";

// Thrown when a compute is abandoned because the settings (or the visible
// range) changed before it finished. Callers treat it as "no longer wanted"
// rather than as a failure worth surfacing.
export class ComputeCanceledError extends Error {
  constructor() {
    super("Spectrogram computation canceled");
    this.name = "ComputeCanceledError";
  }
}

export const isComputeCanceled = (err: unknown): boolean =>
  err instanceof ComputeCanceledError ||
  (err instanceof Error && err.name === "ComputeCanceledError");

export type ComputeHandle = {
  promise: Promise<SpectrogramResult>;
  cancel: () => void;
};

export type ComputeStatus = {
  // Number of jobs running or waiting to run.
  pending: number;
  // Progress of the job currently running, in [0, 1], or null if unknown.
  progress: number | null;
};

type Job = {
  requestId: number;
  input: SpectrogramInput;
  onProgress?: (fraction: number) => void;
  resolve: (result: SpectrogramResult) => void;
  reject: (err: unknown) => void;
  canceled: boolean;
};

// Owns the compute worker and serializes jobs through it.
//
// A worker runs its message handler to completion, so a long spectrogram
// cannot be interrupted by posting to it — a stale job would have to finish
// before a newly requested one even starts. To make setting changes feel
// immediate, canceling the running job discards the whole worker and starts a
// fresh one for the remaining queue; canceling a queued job just drops it.
const defaultWorkerFactory = (): Worker =>
  new Worker(new URL("./worker", import.meta.url), { type: "module" });

export class SpectrogramWorkerClient {
  // Injectable so the queueing/cancellation logic can be tested without a real
  // worker.
  constructor(private createWorker: () => Worker = defaultWorkerFactory) {}

  private worker: Worker | null = null;
  private queue: Job[] = [];
  private running: Job | null = null;
  private runningProgress: number | null = null;
  private requestIdCounter = 0;
  private disposed = false;
  private statusListeners = new Set<(status: ComputeStatus) => void>();

  // Subscribe to running/queued job counts (for a global activity indicator).
  // Returns an unsubscribe function.
  onStatusChange(listener: (status: ComputeStatus) => void): () => void {
    this.statusListeners.add(listener);
    listener(this.status());
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  status(): ComputeStatus {
    return {
      pending: this.queue.length + (this.running ? 1 : 0),
      progress: this.running ? this.runningProgress : null,
    };
  }

  submit(
    input: SpectrogramInput,
    onProgress?: (fraction: number) => void,
  ): ComputeHandle {
    const job: Job = {
      requestId: ++this.requestIdCounter,
      input,
      onProgress,
      resolve: () => undefined,
      reject: () => undefined,
      canceled: false,
    };
    const promise = new Promise<SpectrogramResult>((resolve, reject) => {
      job.resolve = resolve;
      job.reject = reject;
    });
    if (this.disposed) {
      job.reject(new ComputeCanceledError());
      return { promise, cancel: () => undefined };
    }
    this.queue.push(job);
    this.notify();
    this.pump();
    return { promise, cancel: () => this.cancel(job) };
  }

  dispose() {
    this.disposed = true;
    const pending = [...this.queue, ...(this.running ? [this.running] : [])];
    this.queue = [];
    this.running = null;
    this.runningProgress = null;
    this.killWorker();
    for (const job of pending) {
      job.canceled = true;
      job.reject(new ComputeCanceledError());
    }
    this.statusListeners.clear();
  }

  private cancel(job: Job) {
    if (job.canceled) return;
    job.canceled = true;
    if (this.running === job) {
      // Can't interrupt a running worker from the outside: replace it.
      this.killWorker();
      this.running = null;
      this.runningProgress = null;
      job.reject(new ComputeCanceledError());
      this.pump();
      this.notify();
      return;
    }
    const index = this.queue.indexOf(job);
    if (index >= 0) this.queue.splice(index, 1);
    job.reject(new ComputeCanceledError());
    this.notify();
  }

  private pump() {
    if (this.disposed || this.running) return;
    const next = this.queue.shift();
    if (!next) {
      this.notify();
      return;
    }
    this.running = next;
    this.runningProgress = null;
    this.ensureWorker().postMessage({
      requestId: next.requestId,
      input: next.input,
    });
    this.notify();
  }

  private ensureWorker(): Worker {
    if (!this.worker) {
      this.worker = this.createWorker();
      this.worker.addEventListener("message", this.handleMessage);
    }
    return this.worker;
  }

  private killWorker() {
    if (!this.worker) return;
    this.worker.removeEventListener("message", this.handleMessage);
    this.worker.terminate();
    this.worker = null;
  }

  private handleMessage = (evt: MessageEvent) => {
    const job = this.running;
    // Messages from a terminated worker, or for a job we already gave up on.
    if (!job || evt.data?.requestId !== job.requestId) return;
    if (typeof evt.data.progress === "number") {
      this.runningProgress = evt.data.progress;
      job.onProgress?.(evt.data.progress);
      this.notify();
      return;
    }
    this.running = null;
    this.runningProgress = null;
    if (evt.data.error) job.reject(new Error(evt.data.error));
    else job.resolve(evt.data.result as SpectrogramResult);
    this.pump();
    this.notify();
  };

  private notify() {
    if (this.statusListeners.size === 0) return;
    const status = this.status();
    for (const listener of this.statusListeners) listener(status);
  }
}

export default SpectrogramWorkerClient;
