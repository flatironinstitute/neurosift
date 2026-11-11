// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import FigpackJobStatusDisplay from "./FigpackJobStatusDisplay";

afterEach(cleanup);

const ADMIN = "https://runpack-admin.neurosift.app/jobs/abc123";

const show = (
  job: { job_id?: string; status: string; error?: string } | null,
  extra: { error?: string | null; isLoading?: boolean } = {},
) => {
  const submitJob = vi.fn();
  const refreshStatus = vi.fn();
  render(
    <FigpackJobStatusDisplay
      job={job}
      error={extra.error ?? null}
      isLoading={extra.isLoading ?? false}
      submitJob={submitJob}
      refreshStatus={refreshStatus}
      generateButtonText="Generate Figpack Raster Plot"
    />,
  );
  return { submitJob, refreshStatus };
};

const viewJobLink = () => screen.getByRole("link", { name: "View job" });

describe("FigpackJobStatusDisplay", () => {
  it("offers a Primary button that submits the job when there is none", () => {
    const { submitJob } = show(null);
    const button = screen.getByRole("button", {
      name: "Generate Figpack Raster Plot",
    });
    expect(button.className).toContain("ns-button--primary");
    fireEvent.click(button);
    expect(submitJob).toHaveBeenCalledTimes(1);
  });

  it.each(["pending", "claimed"])(
    "says a %s job is queued, with Refresh status and View job",
    (status) => {
      const { refreshStatus } = show({ job_id: "abc123", status });
      expect(screen.getByRole("status").textContent).toContain("Job pending");
      expect(screen.getByText(/queued and waiting for a worker/)).toBeTruthy();
      fireEvent.click(screen.getByRole("button", { name: "Refresh status" }));
      expect(refreshStatus).toHaveBeenCalledTimes(1);
      expect(viewJobLink().getAttribute("href")).toBe(ADMIN);
      expect(viewJobLink().getAttribute("target")).toBe("_blank");
    },
  );

  it("says a job is in progress, with Refresh status", () => {
    show({ job_id: "abc123", status: "in_progress" });
    expect(screen.getByRole("status").textContent).toContain("Job in progress");
    expect(screen.getByRole("button", { name: "Refresh status" })).toBeTruthy();
  });

  it("ignores Refresh status while it checks", () => {
    const { refreshStatus } = show(
      { job_id: "abc123", status: "pending" },
      { isLoading: true },
    );
    const button = screen.getByRole("button", { name: "Refresh status" });
    expect(button.getAttribute("aria-busy")).toBe("true");
    fireEvent.click(button);
    expect(refreshStatus).not.toHaveBeenCalled();
  });

  it("leaves out View job when the job has no ID", () => {
    show({ status: "pending" });
    expect(screen.queryByRole("link", { name: "View job" })).toBeNull();
  });

  it("marks a completed job with a success badge and View job", () => {
    show({ job_id: "abc123", status: "completed" });
    expect(screen.getByText("Job completed")).toBeTruthy();
    expect(viewJobLink().getAttribute("href")).toBe(ADMIN);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("shows a failed job's error, with Retry job", () => {
    const { submitJob } = show({
      job_id: "abc123",
      status: "failed",
      error: "Worker crashed",
    });
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("Job failed");
    expect(alert.textContent).toContain("Worker crashed");
    fireEvent.click(screen.getByRole("button", { name: "Retry job" }));
    expect(submitJob).toHaveBeenCalledTimes(1);
  });

  it("shows a request error, and an unknown error when there is no message", () => {
    show(null, { error: "Failed to submit job: Bad Gateway" });
    expect(screen.getByRole("alert").textContent).toContain(
      "Failed to submit job: Bad Gateway",
    );
    cleanup();
    show({ status: "failed" });
    expect(screen.getByRole("alert").textContent).toContain(
      "An unknown error occurred",
    );
  });

  it("says an expired job's output is gone, with Submit new job", () => {
    const { submitJob } = show({ job_id: "abc123", status: "expired" });
    expect(screen.getByText("Job expired")).toBeTruthy();
    expect(screen.getByText("The job output has expired.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Submit new job" }));
    expect(submitJob).toHaveBeenCalledTimes(1);
  });
});
