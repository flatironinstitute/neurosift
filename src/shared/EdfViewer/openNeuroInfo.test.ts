import { describe, expect, it } from "vitest";
import { openNeuroInfo } from "./openNeuroInfo";

describe("openNeuroInfo", () => {
  it("reads the dataset, subject, session, modality and file from an OpenNeuro URL", () => {
    expect(
      openNeuroInfo(
        "https://s3.amazonaws.com/openneuro.org/ds003374/sub-01/ses-01/ieeg/sub-01_ses-01_task-jokeit_run-01_ieeg.edf?versionId=fmme9zou",
      ),
    ).toEqual({
      datasetId: "ds003374",
      subjectId: "sub-01",
      sessionId: "ses-01",
      modality: "ieeg",
      fileName: "sub-01_ses-01_task-jokeit_run-01_ieeg.edf",
    });
  });

  it("gives nothing for other URLs or paths without a session", () => {
    expect(openNeuroInfo("https://example.org/a.edf")).toBeNull();
    expect(
      openNeuroInfo(
        "https://s3.amazonaws.com/openneuro.org/ds003374/sub-01/ieeg/a.edf",
      ),
    ).toBeNull();
    expect(openNeuroInfo("")).toBeNull();
  });
});
