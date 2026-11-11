import { describe, expect, it } from "vitest";
import { metaLine } from "./metaLine";

const base = { archive: "DANDI" as const, id: "000003", title: "t", path: "p" };

describe("metaLine", () => {
  it("joins subjects, files and size", () => {
    expect(metaLine({ ...base, subjects: 1, files: 2716, size: 81.6e9 })).toBe(
      "1 subject · 2,716 files · 76 GB",
    );
  });

  it("says how many files match in a Contains search", () => {
    expect(metaLine({ ...base, files: 101, matchingFiles: 100 })).toBe(
      "101 files · 100 files match",
    );
    expect(metaLine({ ...base, files: 22, matchingFiles: 22 })).toBe(
      "22 files · all 22 files match",
    );
  });
});
