import { describe, expect, it } from "vitest";
import { SpectrogramInput, SpectrogramResult } from "./WorkerTypes";
import SpectrogramWorkerClient, { isComputeCanceled } from "./workerClient";

// Minimal stand-in for a compute worker: records what was posted and lets the
// test decide when (and whether) each request completes.
class FakeWorker {
  static instances: FakeWorker[] = [];
  posted: { requestId: number }[] = [];
  terminated = false;
  private listeners: ((evt: MessageEvent) => void)[] = [];

  constructor() {
    FakeWorker.instances.push(this);
  }
  postMessage(msg: { requestId: number }) {
    this.posted.push(msg);
  }
  addEventListener(_type: string, listener: (evt: MessageEvent) => void) {
    this.listeners.push(listener);
  }
  removeEventListener(_type: string, listener: (evt: MessageEvent) => void) {
    this.listeners = this.listeners.filter((l) => l !== listener);
  }
  terminate() {
    this.terminated = true;
  }
  emit(data: unknown) {
    for (const listener of [...this.listeners]) {
      listener({ data } as MessageEvent);
    }
  }
}

const fakeResult = (numWindows: number): SpectrogramResult => ({
  powers: [],
  numWindows,
  numFreqs: 1,
  firstWindowCenterTimeSec: 0,
  windowStepSec: 1,
  freqStartHz: 0,
  freqStepHz: 1,
  minPowerDb: 0,
  maxPowerDb: 1,
  effectiveSamplingFrequency: 1000,
  gaps: [],
});

const fakeInput = {} as SpectrogramInput;

const makeClient = () => {
  FakeWorker.instances = [];
  const client = new SpectrogramWorkerClient(
    () => new FakeWorker() as unknown as Worker,
  );
  return { client, workers: FakeWorker.instances };
};

describe("SpectrogramWorkerClient", () => {
  it("runs one job at a time and starts the next when one finishes", async () => {
    const { client, workers } = makeClient();
    const first = client.submit(fakeInput);
    const second = client.submit(fakeInput);

    expect(workers.length).toBe(1);
    expect(workers[0].posted.length).toBe(1);

    workers[0].emit({
      requestId: workers[0].posted[0].requestId,
      result: fakeResult(1),
    });
    await expect(first.promise).resolves.toMatchObject({ numWindows: 1 });
    expect(workers[0].posted.length).toBe(2);

    workers[0].emit({
      requestId: workers[0].posted[1].requestId,
      result: fakeResult(2),
    });
    await expect(second.promise).resolves.toMatchObject({ numWindows: 2 });
  });

  it("drops a queued job without disturbing the running one", async () => {
    const { client, workers } = makeClient();
    const running = client.submit(fakeInput);
    const queued = client.submit(fakeInput);

    queued.cancel();
    await expect(queued.promise).rejects.toSatisfy(isComputeCanceled);
    expect(workers[0].terminated).toBe(false);

    workers[0].emit({
      requestId: workers[0].posted[0].requestId,
      result: fakeResult(1),
    });
    await expect(running.promise).resolves.toMatchObject({ numWindows: 1 });
    // The canceled job must never reach the worker.
    expect(workers[0].posted.length).toBe(1);
  });

  it("replaces the worker when the running job is canceled, so the next job starts immediately", async () => {
    const { client, workers } = makeClient();
    const running = client.submit(fakeInput);
    const next = client.submit(fakeInput);

    running.cancel();
    await expect(running.promise).rejects.toSatisfy(isComputeCanceled);
    expect(workers[0].terminated).toBe(true);
    expect(workers.length).toBe(2);
    expect(workers[1].posted.length).toBe(1);

    workers[1].emit({
      requestId: workers[1].posted[0].requestId,
      result: fakeResult(3),
    });
    await expect(next.promise).resolves.toMatchObject({ numWindows: 3 });
  });

  it("forwards progress without settling the job", async () => {
    const { client, workers } = makeClient();
    const seen: number[] = [];
    const job = client.submit(fakeInput, (f) => seen.push(f));
    const requestId = workers[0].posted[0].requestId;

    workers[0].emit({ requestId, progress: 0.25 });
    workers[0].emit({ requestId, progress: 0.75 });
    expect(seen).toEqual([0.25, 0.75]);
    expect(client.status()).toMatchObject({ pending: 1, progress: 0.75 });

    workers[0].emit({ requestId, result: fakeResult(4) });
    await expect(job.promise).resolves.toMatchObject({ numWindows: 4 });
    expect(client.status()).toEqual({ pending: 0, progress: null });
  });

  it("rejects an errored job and moves on", async () => {
    const { client, workers } = makeClient();
    const job = client.submit(fakeInput);
    workers[0].emit({
      requestId: workers[0].posted[0].requestId,
      error: "bad window size",
    });
    await expect(job.promise).rejects.toThrow("bad window size");
  });

  it("cancels everything on dispose", async () => {
    const { client, workers } = makeClient();
    const running = client.submit(fakeInput);
    const queued = client.submit(fakeInput);
    client.dispose();
    await expect(running.promise).rejects.toSatisfy(isComputeCanceled);
    await expect(queued.promise).rejects.toSatisfy(isComputeCanceled);
    expect(workers[0].terminated).toBe(true);
  });
});
