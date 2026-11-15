import { describe, expect, it, vi } from "vitest";
import {
  findFolder,
  folderCrumbs,
  joinLocation,
  locationSearch,
  parentLocation,
  parseLocation,
} from "./folderLocation";
import { DatasetFile } from "./plugins/pluginInterface";

describe("parseLocation", () => {
  it("is the root when there is no location", () => {
    expect(parseLocation(null)).toBe("");
    expect(parseLocation("")).toBe("");
    expect(parseLocation("/")).toBe("");
  });

  it("drops leading, trailing and doubled slashes", () => {
    expect(parseLocation("/sub-MITU01//ses-1/micr/")).toBe(
      "sub-MITU01/ses-1/micr",
    );
  });

  it("keeps names DANDI allows, such as + and spaces", () => {
    expect(parseLocation("pipeline-aind+ephys/run 1")).toBe(
      "pipeline-aind+ephys/run 1",
    );
  });

  it("refuses a path that climbs out with . or ..", () => {
    expect(parseLocation("sub-1/../sub-2")).toBeNull();
    expect(parseLocation("./sub-1")).toBeNull();
  });
});

describe("joinLocation and parentLocation", () => {
  it("joins a folder name onto a path, or starts one from the root", () => {
    expect(joinLocation("", "sub-1")).toBe("sub-1");
    expect(joinLocation("sub-1", "ses-1")).toBe("sub-1/ses-1");
  });

  it("goes up one level, and the root stays the root", () => {
    expect(parentLocation("sub-1/ses-1")).toBe("sub-1");
    expect(parentLocation("sub-1")).toBe("");
    expect(parentLocation("")).toBe("");
  });
});

describe("locationSearch", () => {
  it("sets location and keeps the version and other parameters", () => {
    expect(locationSearch("?dandisetVersion=draft", "sub-1/ses-1")).toBe(
      "?dandisetVersion=draft&location=sub-1/ses-1",
    );
  });

  it("encodes names but keeps the slashes readable, as DANDI does", () => {
    expect(locationSearch("", "pipeline-aind+ephys/run-1")).toBe(
      "?location=pipeline-aind%2Bephys/run-1",
    );
  });

  it("replaces an earlier location", () => {
    expect(
      locationSearch("?location=sub-1&dandisetVersion=0.1.0", "sub-2"),
    ).toBe("?location=sub-2&dandisetVersion=0.1.0");
  });

  it("drops location at the root", () => {
    expect(locationSearch("?dandisetVersion=draft&location=sub-1", "")).toBe(
      "?dandisetVersion=draft",
    );
    expect(locationSearch("?location=sub-1", "")).toBe("?");
  });
});

describe("folderCrumbs", () => {
  const hrefFor = (path: string) => `#${path}`;

  it("is All files alone at the root", () => {
    expect(folderCrumbs("", hrefFor)).toEqual([
      { label: "All files", href: "#" },
    ]);
  });

  it("links All files and every folder on the way down", () => {
    expect(folderCrumbs("sub-1/ses-1/micr", hrefFor)).toEqual([
      { label: "All files", href: "#" },
      { label: "sub-1", href: "#sub-1", code: true },
      { label: "ses-1", href: "#sub-1/ses-1", code: true },
      { label: "micr", href: "#sub-1/ses-1/micr", code: true },
    ]);
  });
});

const file = (filepath: string, directory: boolean): DatasetFile => ({
  id: `id:${filepath}`,
  key: filepath,
  filename: filepath.split("/").pop() ?? filepath,
  filepath,
  parentId: "",
  size: 0,
  directory,
  urls: [],
});

describe("findFolder", () => {
  const tree: Record<string, DatasetFile[]> = {
    "id:sub-1": [file("sub-1/ses-1", true), file("sub-1/notes.txt", false)],
    "id:sub-1/ses-1": [file("sub-1/ses-1/a.nwb", false)],
  };
  const topLevel = [file("sub-1", true), file("README", false)];

  it("walks down by name, one folder at a time", async () => {
    const fetchDirectory = vi.fn(async (f: DatasetFile) => tree[f.id] ?? []);
    const files = await findFolder("sub-1/ses-1", topLevel, fetchDirectory);
    expect(files?.map((f) => f.filename)).toEqual(["a.nwb"]);
    expect(fetchDirectory).toHaveBeenCalledTimes(2);
  });

  it("returns the top level for the root without fetching", async () => {
    const fetchDirectory = vi.fn();
    expect(await findFolder("", topLevel, fetchDirectory)).toBe(topLevel);
    expect(fetchDirectory).not.toHaveBeenCalled();
  });

  it("is null for a missing folder or a file", async () => {
    const fetchDirectory = async (f: DatasetFile) => tree[f.id] ?? [];
    expect(await findFolder("sub-2", topLevel, fetchDirectory)).toBeNull();
    expect(await findFolder("README", topLevel, fetchDirectory)).toBeNull();
    expect(
      await findFolder("sub-1/notes.txt", topLevel, fetchDirectory),
    ).toBeNull();
  });
});
