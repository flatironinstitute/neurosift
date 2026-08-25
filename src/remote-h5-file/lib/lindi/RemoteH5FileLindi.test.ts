import { describe, expect, it, vi } from "vitest";
import type RemoteH5FileLindiType from "./RemoteH5FileLindi";
import type { ZarrFileSystemClient as ZarrFileSystemClientType } from "./RemoteH5FileLindi";

// The LINDI reader imports the worker-backed HDF5 reader, which creates a web
// worker when its module is loaded, so a stub is needed to import it in node.
vi.stubGlobal(
  "Worker",
  class {
    postMessage() {}
    addEventListener() {}
    removeEventListener() {}
    terminate() {}
  },
);
if (typeof URL.createObjectURL !== "function") {
  URL.createObjectURL = () => "blob:stub";
}
const { default: RemoteH5FileLindi, ZarrFileSystemClient } =
  await import("./RemoteH5FileLindi");

// A small stand-in for an NWB file in which one RoiResponseSeries owns its
// timestamps and a second one soft links to them, which is what pynwb writes
// when the same timestamps object is passed to more than one series.
const metadata: { [key: string]: unknown } = {
  ".zgroup": { zarr_format: 2 },
  ".zattrs": {},

  "Corrected/.zgroup": { zarr_format: 2 },
  "Corrected/.zattrs": { neurodata_type: "RoiResponseSeries" },
  "Corrected/data/.zarray": {
    zarr_format: 2,
    shape: [10, 3],
    dtype: "<f4",
    chunks: [10, 3],
  },
  "Corrected/data/.zattrs": { unit: "n.a." },
  "Corrected/timestamps/.zarray": {
    zarr_format: 2,
    shape: [10],
    dtype: "<f8",
    chunks: [10],
  },
  "Corrected/timestamps/.zattrs": { unit: "seconds", interval: 1 },

  "DfOverF/.zgroup": { zarr_format: 2 },
  "DfOverF/.zattrs": { neurodata_type: "RoiResponseSeries" },
  "DfOverF/data/.zarray": {
    zarr_format: 2,
    shape: [10, 3],
    dtype: "<f4",
    chunks: [10, 3],
  },
  "DfOverF/data/.zattrs": { unit: "a.u." },
  "DfOverF/timestamps/.zgroup": { zarr_format: 2 },
  "DfOverF/timestamps/.zattrs": {
    _SOFT_LINK: { path: "/Corrected/timestamps" },
  },

  "LinkedSeries/.zgroup": { zarr_format: 2 },
  "LinkedSeries/.zattrs": { _SOFT_LINK: { path: "/Corrected" } },

  "BrokenLink/.zgroup": { zarr_format: 2 },
  "BrokenLink/.zattrs": { _SOFT_LINK: { path: "/does/not/exist" } },

  "CycleA/.zgroup": { zarr_format: 2 },
  "CycleA/.zattrs": { _SOFT_LINK: { path: "/CycleB" } },
  "CycleB/.zgroup": { zarr_format: 2 },
  "CycleB/.zattrs": { _SOFT_LINK: { path: "/CycleA" } },
};

const pathsByParentPath: { [key: string]: string[] } = {
  "": [
    "Corrected",
    "DfOverF",
    "LinkedSeries",
    "BrokenLink",
    "CycleA",
    "CycleB",
  ],
  Corrected: ["Corrected/data", "Corrected/timestamps"],
  DfOverF: ["DfOverF/data", "DfOverF/timestamps"],
};

const createFile = () => {
  const client = new ZarrFileSystemClient("http://localhost/test", {
    metadata,
  });
  // The constructor is not part of the public API; files are normally created
  // through RemoteH5FileLindi.create, which fetches the sidecar.
  const Ctor = RemoteH5FileLindi as unknown as new (
    url: string,
    client: ZarrFileSystemClientType,
    pathsByParentPath: { [key: string]: string[] },
  ) => RemoteH5FileLindiType;
  return new Ctor("http://localhost/test", client, pathsByParentPath);
};

describe("RemoteH5FileLindi soft links", () => {
  it("reports a soft-linked dataset as a dataset of the group", async () => {
    const f = createFile();
    const group = await f.getGroup("/DfOverF");
    expect(group).toBeDefined();
    const names = group!.datasets.map((ds) => ds.name).sort();
    expect(names).toEqual(["data", "timestamps"]);
    expect(group!.subgroups).toEqual([]);
  });

  it("gives the soft-linked dataset the shape and attributes of its target", async () => {
    const f = createFile();
    const group = await f.getGroup("/DfOverF");
    const ts = group!.datasets.find((ds) => ds.name === "timestamps");
    expect(ts).toBeDefined();
    expect(ts!.shape).toEqual([10]);
    expect(ts!.dtype).toBe("<f8");
    expect(ts!.attrs).toEqual({ unit: "seconds", interval: 1 });
    // the link keeps its own path, not that of the target
    expect(ts!.path).toBe("/DfOverF/timestamps");
  });

  it("resolves a soft link when the dataset itself is requested", async () => {
    const f = createFile();
    const ds = await f.getDataset("/DfOverF/timestamps");
    expect(ds).toBeDefined();
    expect(ds!.shape).toEqual([10]);
    expect(ds!.dtype).toBe("<f8");
    expect(ds!.attrs).toEqual({ unit: "seconds", interval: 1 });
  });

  it("leaves a plain dataset alone", async () => {
    const f = createFile();
    const ds = await f.getDataset("/Corrected/timestamps");
    expect(ds!.shape).toEqual([10]);
    expect(ds!.attrs).toEqual({ unit: "seconds", interval: 1 });
  });

  it("resolves a soft link to a group", async () => {
    const f = createFile();
    const root = await f.getGroup("/");
    const linked = root!.subgroups.find((sg) => sg.name === "LinkedSeries");
    expect(linked).toBeDefined();
    expect(linked!.attrs).toEqual({ neurodata_type: "RoiResponseSeries" });

    const group = await f.getGroup("/LinkedSeries");
    expect(group!.datasets.map((ds) => ds.name).sort()).toEqual([
      "data",
      "timestamps",
    ]);
  });

  it("falls back to the link itself when the target is missing", async () => {
    const f = createFile();
    const root = await f.getGroup("/");
    const broken = root!.subgroups.find((sg) => sg.name === "BrokenLink");
    expect(broken).toBeDefined();
    expect(broken!.path).toBe("/BrokenLink");
  });

  it("does not follow a cycle of soft links indefinitely", async () => {
    const f = createFile();
    const root = await f.getGroup("/");
    expect(root!.subgroups.map((sg) => sg.name)).toContain("CycleA");
  });
});
