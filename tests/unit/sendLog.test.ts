import { sendLog } from "../../src/util/sendLog";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const WORKER_URL = "https://neurosift-logs.figurl.workers.dev";
const RATE_LIMIT_KEY = "neurosift-log-last-sent";

// Exercises the localStorage-backed rate limiting in src/util/sendLog.ts, which
// is why this suite needs the jsdom environment.
describe("sendLog", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T00:00:00Z"));
    fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("posts the payload as JSON and records the send time", async () => {
    await sendLog({ message: "hello", metadata: { url: "/nwb" } });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(WORKER_URL);
    expect(init.method).toBe("POST");
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(JSON.parse(init.body)).toEqual({
      message: "hello",
      metadata: { url: "/nwb" },
    });
    expect(localStorage.getItem(RATE_LIMIT_KEY)).toBe(String(Date.now()));
  });

  it("drops a second call made inside the rate-limit window", async () => {
    await sendLog({ message: "first" });
    vi.advanceTimersByTime(4_999);
    await sendLog({ message: "second" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("sends again once the rate-limit window has elapsed", async () => {
    await sendLog({ message: "first" });
    vi.advanceTimersByTime(5_000);
    await sendLog({ message: "second" });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not start the rate-limit window when the worker rejects the log", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    fetchMock.mockResolvedValue({ ok: false, status: 500 });

    await sendLog({ message: "hello" });

    expect(localStorage.getItem(RATE_LIMIT_KEY)).toBeNull();
  });

  it("swallows network errors so a failed log cannot break the app", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    fetchMock.mockRejectedValue(new Error("offline"));

    await expect(sendLog({ message: "hello" })).resolves.toBeUndefined();
  });
});
