import { describe, expect, it } from "vitest";
import { statusWords } from "./statusWords";

describe("statusWords", () => {
  it("says what has been read, in words, on one line", () => {
    expect(
      statusWords({
        hdf5Stats: { type: "stats", groups: 19484, datasets: 1267, reads: 97 },
      }),
    ).toEqual(["Read 19,484 groups · 1,267 datasets · 97 data requests"]);
  });

  it("puts what is being read first, counted by kind", () => {
    expect(
      statusWords({
        a: { type: "reading", what: "group", path: "/acquisition" },
        b: { type: "reading", what: "group", path: "/units" },
        c: { type: "reading", what: "data", path: "/acquisition/LFPs/data" },
        hdf5Stats: { type: "stats", groups: 1, datasets: 0, reads: 1 },
      }),
    ).toEqual([
      "Reading 2 groups and 1 data block",
      "Read 1 group · 0 datasets · 1 data request",
    ]);
  });

  it("says nothing when nothing has been read", () => {
    expect(statusWords({})).toEqual([]);
  });
});
