import { describe, expect, it } from "vitest";
import { linkTarget } from "./openLink";

describe("linkTarget", () => {
  it("opens NWB, LINDI and Zarr files and DANDI asset downloads in the viewer", () => {
    const asset =
      "https://api.dandiarchive.org/api/assets/65a7e913-45c7-48db-bf19-b9f5e910110a/download/";
    expect(linkTarget(asset)).toEqual({
      kind: "file",
      path: `nwb?url=${encodeURIComponent(asset)}`,
    });
    expect(linkTarget("https://x.org/a/session.nwb").kind).toBe("file");
    expect(linkTarget("https://x.org/a/session.nwb.lindi.json").kind).toBe(
      "file",
    );
    expect(linkTarget("https://x.org/a/b.zarr/").kind).toBe("file");
  });

  it("opens a dataset page link as the dataset, and says so", () => {
    expect(
      linkTarget("https://dandiarchive.org/dandiset/000673"),
    ).toMatchObject({ kind: "dataset", path: "dandiset/000673" });
    expect(
      linkTarget("https://dandi.emberarchive.org/dandiset/000207/draft"),
    ).toMatchObject({ path: "ember-dandiset/000207" });
    expect(
      linkTarget("https://openneuro.org/datasets/ds000001/versions/1.0.0"),
    ).toMatchObject({ path: "openneuro-dataset/ds000001" });
  });

  it("treats words as a search and other links as unsupported", () => {
    expect(linkTarget("hippocampus")).toEqual({ kind: "text" });
    expect(linkTarget("https://example.org/paper.pdf")).toEqual({
      kind: "unsupported",
    });
  });
});
