import { describe, expect, it } from "vitest";
import { MAX_IMAGE_BYTES, datasetBytes, tooLargeMessage } from "./datasetSize";

describe("dataset size", () => {
  it("counts the bytes of a whole dataset from its shape and dtype", () => {
    expect(datasetBytes([7745, 11396], "<f4")).toBe(7745 * 11396 * 4);
    expect(datasetBytes([1200, 1920, 3], "|u1")).toBe(1200 * 1920 * 3);
  });

  it("counts only the sliced part", () => {
    expect(datasetBytes([1000, 512, 512], "<i2", [[10, 12]])).toBe(
      2 * 512 * 512 * 2,
    );
  });

  it("assumes 8 bytes per value when the dtype doesn't say", () => {
    expect(datasetBytes([10], "object")).toBe(80);
  });

  it("says how large the dataset is and what the limit is", () => {
    expect(
      tooLargeMessage(
        "/processing/imaging/confocal/Confocal max z projection",
        7745 * 11396 * 4,
        MAX_IMAGE_BYTES,
      ),
    ).toBe(
      "The dataset “/processing/imaging/confocal/Confocal max z projection” is too large to load (336.69 MB). The limit is 50 MB.",
    );
  });
});
