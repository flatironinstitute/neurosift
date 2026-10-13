// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

const sendLog = vi.fn();
vi.mock("./sendLog", () => ({ sendLog }));

const {
  installGlobalErrorReporting,
  issueUrlForError,
  pageUrlForReport,
  reportError,
  resetReportedErrors,
} = await import("./reportError");

const presignParams =
  "X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIA%2F20250101&X-Amz-Signature=abc123";

beforeEach(() => {
  sendLog.mockClear();
  resetReportedErrors();
});

describe("pageUrlForReport", () => {
  it("leaves an ordinary page url alone", () => {
    const href =
      "https://neurosift.app/nwb?url=https://api.dandiarchive.org/api/assets/abc/download/&dandisetId=000004&tab=/units";
    expect(pageUrlForReport(href)).toBe(href);
  });

  it("drops the signature of a presigned file url embedded unencoded", () => {
    const href = `https://neurosift.app/nwb?url=https://bucket.s3.amazonaws.com/a.nwb?${presignParams}&tab=/units`;
    const out = pageUrlForReport(href);
    expect(out).not.toContain("abc123");
    expect(out).toContain("https://bucket.s3.amazonaws.com/a.nwb");
    expect(out).toContain("tab=/units");
  });

  it("drops the signature of a presigned file url embedded encoded", () => {
    const fileUrl = `https://bucket.s3.amazonaws.com/a.nwb?${presignParams}`;
    const href = `https://neurosift.app/nwb?url=${encodeURIComponent(fileUrl)}&tab=/units`;
    const out = pageUrlForReport(href);
    expect(out).not.toContain("abc123");
    expect(out).toBe(
      `https://neurosift.app/nwb?url=${encodeURIComponent("https://bucket.s3.amazonaws.com/a.nwb")}&tab=/units`,
    );
  });
});

describe("reportError", () => {
  it("sends the error with its source under its own rate limit", () => {
    reportError(new TypeError("x is undefined"), { source: "render" });
    expect(sendLog).toHaveBeenCalledTimes(1);
    const [payload, rateLimitKey] = sendLog.mock.calls[0];
    expect(payload.message).toBe("Error: TypeError: x is undefined");
    expect(payload.metadata.source).toBe("render");
    expect(payload.metadata.stack).toContain("TypeError: x is undefined");
    // Not the page-load log's key, or an error right after load is dropped.
    expect(rateLimitKey).toBe("neurosift-error-log-last-sent");
  });

  it("reports the same error only once", () => {
    reportError(new Error("boom"), { source: "render" });
    reportError(new Error("boom"), { source: "render" });
    reportError(new Error("another"), { source: "render" });
    expect(sendLog).toHaveBeenCalledTimes(2);
  });

  it("ignores canceled requests and browser noise", () => {
    reportError(new DOMException("The user aborted a request.", "AbortError"), {
      source: "unhandledrejection",
    });
    reportError(
      "ResizeObserver loop completed with undelivered notifications.",
      { source: "window.onerror" },
    );
    reportError("Script error.", { source: "window.onerror" });
    expect(sendLog).not.toHaveBeenCalled();
  });
});

describe("installGlobalErrorReporting", () => {
  it("reports uncaught errors and unhandled rejections", () => {
    const target = new EventTarget();
    installGlobalErrorReporting(target as Window);

    target.dispatchEvent(
      Object.assign(new Event("error"), { error: new Error("in a handler") }),
    );
    target.dispatchEvent(
      Object.assign(new Event("unhandledrejection"), {
        reason: new Error("in a promise"),
      }),
    );

    expect(
      sendLog.mock.calls.map(([p]) => [p.message, p.metadata.source]),
    ).toEqual([
      ["Error: Error: in a handler", "window.onerror"],
      ["Error: Error: in a promise", "unhandledrejection"],
    ]);
  });
});

describe("issueUrlForError", () => {
  it("keeps a presigned signature out of the issue", () => {
    const href = `https://neurosift.app/nwb?url=https://bucket.s3.amazonaws.com/a.nwb?${presignParams}`;
    const url = new URL(issueUrlForError(new Error("boom"), "this view", href));
    expect(url.searchParams.get("body")).not.toContain("abc123");
    expect(url.searchParams.get("body")).toContain(
      "https://bucket.s3.amazonaws.com/a.nwb",
    );
  });

  it("keeps the title short", () => {
    const url = new URL(
      issueUrlForError(new Error("x".repeat(500)), "this view", "https://x/"),
    );
    expect(url.searchParams.get("title")!.length).toBeLessThanOrEqual(120);
  });
});
