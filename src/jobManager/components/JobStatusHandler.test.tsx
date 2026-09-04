// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { JobStatusHandler } from "./JobStatusHandler";
import { Job } from "../useNeurosiftJob";

const noop = () => {};

describe("JobStatusHandler", () => {
  it("shows the failure message as text rather than a template literal", () => {
    const job = {
      status: "failed",
      error: "out of memory",
    } as unknown as Job;
    const { container } = render(
      <JobStatusHandler
        job={job}
        error={null}
        isRefreshing={false}
        onSubmit={noop}
        onRefresh={noop}
        onCancel={noop}
        onDelete={noop}
        jobLabel="Spike sorting"
        imageName="neurosift-job-runner"
      />,
    );
    expect(container.textContent).toContain(
      "Spike sorting failed: out of memory",
    );
    expect(container.textContent).not.toContain("`");
    expect(container.textContent).not.toContain("${");
  });

  it("prefers the request error when one is given", () => {
    const job = { status: "failed", error: "job error" } as unknown as Job;
    const { container } = render(
      <JobStatusHandler
        job={job}
        error="network down"
        isRefreshing={false}
        onSubmit={noop}
        onRefresh={noop}
        onCancel={noop}
        onDelete={noop}
        jobLabel="Spike sorting"
        imageName="neurosift-job-runner"
      />,
    );
    expect(container.textContent).toContain(
      "Spike sorting failed: network down",
    );
  });
});
