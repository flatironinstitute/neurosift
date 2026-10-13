import { describe, expect, test } from "vitest";
import { hasLfpInPathName, isUnderLfpModule } from "./lfpDetection";

describe("isUnderLfpModule", () => {
  test("matches a processing module named LFP", () => {
    expect(isUnderLfpModule("/processing/LFP/ElectricalSeries")).toBe(true);
    expect(isUnderLfpModule("/processing/ecephys/LFP/ElectricalSeries")).toBe(
      true,
    );
  });

  test("ignores LFP outside processing", () => {
    expect(isUnderLfpModule("/acquisition/LFP/ElectricalSeries")).toBe(false);
  });
});

describe("hasLfpInPathName", () => {
  test("matches LFP in the object's own name", () => {
    expect(hasLfpInPathName("/acquisition/ElectricalSeriesLFP")).toBe(true);
    expect(hasLfpInPathName("/acquisition/ieeg_lfp")).toBe(true);
  });

  test("matches LFP in a container name", () => {
    expect(hasLfpInPathName("/acquisition/LFP/ElectricalSeries")).toBe(true);
    expect(hasLfpInPathName("/processing/ecephys/LFP/ElectricalSeries")).toBe(
      true,
    );
  });

  test("matches SpikeGLX LF streams", () => {
    expect(hasLfpInPathName("/acquisition/ElectricalSeriesLF")).toBe(true);
    expect(hasLfpInPathName("/acquisition/ElectricalSeriesLFIMEC0")).toBe(true);
  });

  test("matches names ending in .lf", () => {
    expect(hasLfpInPathName("/acquisition/imec0.lf")).toBe(true);
    expect(hasLfpInPathName("/acquisition/imec0.LF")).toBe(true);
    expect(hasLfpInPathName("/acquisition/imec0.lf/ElectricalSeries")).toBe(
      true,
    );
  });

  test("does not match paths without LFP", () => {
    expect(hasLfpInPathName("/acquisition/ElectricalSeries")).toBe(false);
    expect(hasLfpInPathName("/acquisition/ElectricalSeriesAP")).toBe(false);
    expect(hasLfpInPathName("/acquisition/half_rate_series")).toBe(false);
    expect(hasLfpInPathName("/acquisition/imec0.ap")).toBe(false);
    expect(hasLfpInPathName("/acquisition/shelf.lfoo")).toBe(false);
  });
});
