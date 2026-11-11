// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { addRecentDataset, getRecentDatasets } from "./recentDatasets";

beforeEach(() => localStorage.clear());

describe("recentDatasets", () => {
  it("keeps one list across archives, newest first, without repeats", () => {
    addRecentDataset("DANDI", "000673");
    addRecentDataset("OpenNeuro", "ds000001");
    addRecentDataset("DANDI", "000673");
    expect(getRecentDatasets().map((r) => `${r.archive}:${r.id}`)).toEqual([
      "DANDI:000673",
      "OpenNeuro:ds000001",
    ]);
  });

  it("adds the older per-archive lists after, and limits the length", () => {
    localStorage.setItem(
      "recentDandisets",
      JSON.stringify(["000728", "000673"]),
    );
    localStorage.setItem("recentEmberDandisets", JSON.stringify(["000207"]));
    addRecentDataset("DANDI", "000673");
    expect(getRecentDatasets(3).map((r) => `${r.archive}:${r.id}`)).toEqual([
      "DANDI:000673",
      "DANDI:000728",
      "EMBER:000207",
    ]);
  });
});
