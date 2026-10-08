import { describe, expect, it, vi } from "vitest";

// The reader's types come from the worker-backed HDF5 reader, which creates a
// web worker when its module is loaded, so a stub is needed to import it in node.
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
const {
  default: RemoteH5FileZarr3,
  isZarrShadowUrl,
  isZarrUrl,
} = await import("./RemoteH5FileZarr3");
const { ReferenceStore } = await import("./store");

const base64 = (bytes: Uint8Array) =>
  "base64:" + btoa(String.fromCharCode(...bytes));

const bytesOf = (values: ArrayBufferView) =>
  new Uint8Array(values.buffer, values.byteOffset, values.byteLength);

// How zarr-python writes an array of variable-length strings (vlen-utf8)
const vlenUtf8 = (strings: string[]) => {
  const encoded = strings.map((s) => new TextEncoder().encode(s));
  const out = new Uint8Array(4 + encoded.reduce((n, e) => n + 4 + e.length, 0));
  const view = new DataView(out.buffer);
  view.setUint32(0, strings.length, true);
  let at = 4;
  for (const e of encoded) {
    view.setUint32(at, e.length, true);
    out.set(e, at + 4);
    at += 4 + e.length;
  }
  return out;
};

const array = (
  shape: number[],
  dataType: string,
  attributes: object = {},
  codecs: object[] = [{ name: "bytes", configuration: { endian: "little" } }],
) => ({
  zarr_format: 3,
  node_type: "array",
  shape,
  data_type: dataType,
  chunk_grid: {
    name: "regular",
    configuration: { chunk_shape: shape.length ? shape : [] },
  },
  chunk_key_encoding: { name: "default", configuration: { separator: "/" } },
  fill_value: dataType === "string" ? "" : dataType === "bool" ? false : 0,
  codecs,
  attributes,
});

const group = (attributes: object = {}) => ({
  zarr_format: 3,
  node_type: "group",
  attributes,
});

const strings = [{ name: "vlen-utf8", configuration: {} }];

// A compound type as hdmf-zarr and zarrshadow write a column of
// TimeSeriesReferenceVectorData: two integers and the path of a series, as
// fixed-length UTF-32. The fields of a record are packed.
const referenceChars = 24;
const timeseriesReference = {
  name: "struct",
  configuration: {
    fields: [
      { name: "idx_start", data_type: "int32" },
      { name: "count", data_type: "int32" },
      {
        name: "timeseries",
        data_type: {
          name: "fixed_length_utf32",
          configuration: { length_bytes: 4 * referenceChars },
        },
      },
    ],
  },
};
const records = (rows: [number, number, string][]) => {
  const size = 8 + 4 * referenceChars;
  const out = new Uint8Array(rows.length * size);
  const view = new DataView(out.buffer);
  rows.forEach(([start, count, path], i) => {
    view.setInt32(i * size, start, true);
    view.setInt32(i * size + 4, count, true);
    Array.from(path).forEach((c, k) =>
      view.setUint32(i * size + 8 + 4 * k, c.codePointAt(0) ?? 0, true),
    );
  });
  return out;
};
const data = Float32Array.from({ length: 30 }, (_, i) => i / 2);
const timestamps = Float64Array.from({ length: 10 }, (_, i) => i * 0.1);

// A small stand-in for the references zarrshadow makes from an NWB file: a
// series that owns its timestamps, a second one that soft links to them, a
// link to a whole group, and a table with a column of object references.
const refs: { [key: string]: unknown } = {
  "zarr.json": group({ nwb_version: "2.7.0" }),
  "acquisition/zarr.json": group(),
  "acquisition/Corrected/zarr.json": group({
    neurodata_type: "RoiResponseSeries",
  }),
  "acquisition/Corrected/data/zarr.json": array([10, 3], "float32", {
    unit: "n.a.",
  }),
  "acquisition/Corrected/data/c/0/0": base64(bytesOf(data)),
  "acquisition/Corrected/timestamps/zarr.json": array([10], "float64", {
    unit: "seconds",
  }),
  "acquisition/Corrected/timestamps/c/0": base64(bytesOf(timestamps)),
  "acquisition/Corrected/rate/zarr.json": array([], "int64"),
  "acquisition/Corrected/rate/c": base64(bytesOf(BigInt64Array.from([30n]))),
  "acquisition/DfOverF/zarr.json": group({
    neurodata_type: "RoiResponseSeries",
    _LINKS: [
      {
        name: "timestamps",
        source: ".",
        path: "/acquisition/Corrected/timestamps",
      },
    ],
  }),
  "processing/zarr.json": group({
    _LINKS: [{ name: "Linked", source: ".", path: "/acquisition/Corrected" }],
  }),
  "table/zarr.json": group({ neurodata_type: "DynamicTable" }),
  "table/label/zarr.json": array([3], "string", { _DTYPE: "str" }, strings),
  "table/label/c/0": base64(vlenUtf8(["a", "bb", ""])),
  "table/group/zarr.json": array(
    [2],
    "string",
    { _DTYPE: "object_reference" },
    strings,
  ),
  "table/group/c/0": base64(
    vlenUtf8(["/acquisition/Corrected", "/acquisition/DfOverF"]),
  ),
  "table/valid/zarr.json": array([3], "bool"),
  "table/valid/c/0": base64(Uint8Array.from([1, 0, 1])),
  "table/id/zarr.json": array([3], "int64"),
  "table/id/c/0": base64(bytesOf(BigInt64Array.from([5n, 6n, 7n]))),
  "table/timeseries/zarr.json": {
    ...array([3], "int8", { _REFERENCE_FIELDS: ["timeseries"] }),
    data_type: timeseriesReference,
  },
  "table/timeseries/c/0": base64(
    records([
      [0, 5, "/acquisition/Corrected"],
      [5, 5, "/acquisition/DfOverF"],
      [-1, -1, "/acquisition/Corrected"],
    ]),
  ),
};

// The same file as a Zarr store that hdmf-zarr could have written: every
// zarr.json and chunk at its own url, and the metadata of every node also in
// the root zarr.json.
const zarrUrl = "http://example.test/data/session.nwb.zarr";
const served = new Map<string, Uint8Array>();
{
  const consolidated: { [path: string]: unknown } = {};
  for (const [key, value] of Object.entries(refs)) {
    if (typeof value === "string") {
      const binary = atob(value.slice("base64:".length));
      served.set(
        key,
        Uint8Array.from(binary, (c) => c.charCodeAt(0)),
      );
    } else if (key !== "zarr.json") {
      consolidated[key.slice(0, -"/zarr.json".length)] = value;
      served.set(key, new TextEncoder().encode(JSON.stringify(value)));
    }
  }
  const root = {
    ...(refs["zarr.json"] as object),
    consolidated_metadata: {
      kind: "inline",
      must_understand: false,
      metadata: consolidated,
    },
  };
  served.set("zarr.json", new TextEncoder().encode(JSON.stringify(root)));
}
const serve = async (input: RequestInfo | URL) => {
  const url = typeof input === "string" ? input : (input as Request).url;
  const key = url.split("?")[0].slice(zarrUrl.length + 1);
  const body = served.get(key);
  return body
    ? new Response(body, { status: 200 })
    : new Response(null, { status: 404 });
};

const open = () => {
  const store = new ReferenceStore({ version: 2, refs } as never);
  return new RemoteH5FileZarr3("http://localhost/test.nwb.zarrshadow", {
    store,
    children: (path) => store.children(path),
  });
};

describe("RemoteH5FileZarr3", () => {
  it("lists a group's children with their attributes", async () => {
    const f = open();
    const root = await f.getGroup("/");
    expect(root?.attrs).toEqual({ nwb_version: "2.7.0" });
    expect(root?.subgroups.map((g) => g.path)).toEqual([
      "/acquisition",
      "/processing",
      "/table",
    ]);
    const series = await f.getGroup("/acquisition/Corrected");
    expect(series?.attrs).toEqual({ neurodata_type: "RoiResponseSeries" });
    expect(series?.datasets).toEqual([
      {
        name: "data",
        path: "/acquisition/Corrected/data",
        shape: [10, 3],
        dtype: "<f4",
        attrs: { unit: "n.a." },
        chunks: [10, 3],
        compressor: undefined,
        filters: undefined,
      },
      expect.objectContaining({ name: "rate", shape: [], dtype: "<i8" }),
      expect.objectContaining({ name: "timestamps", dtype: "<f8" }),
    ]);
    expect(await f.getGroup("/nothing")).toBeUndefined();
    expect(await f.getGroup("/acquisition/Corrected/data")).toBeUndefined();
  });

  it("reads data, sliced along the leading dimensions", async () => {
    const f = open();
    const path = "/acquisition/Corrected/data";
    expect(await f.getDatasetData(path, {})).toEqual(data);
    expect(await f.getDatasetData(path, { slice: [[2, 4]] })).toEqual(
      data.slice(6, 12),
    );
    expect(
      await f.getDatasetData(path, {
        slice: [
          [2, 4],
          [1, 3],
        ],
      }),
    ).toEqual(Float32Array.from([3.5, 4, 5, 5.5]));
    expect(await f.getDatasetData("/nothing", {})).toBeUndefined();
  });

  it("follows a soft link to a dataset and to a group", async () => {
    const f = open();
    const linked = await f.getGroup("/acquisition/DfOverF");
    // the link is reported as the dataset it points at, under its own path
    expect(linked?.attrs).toEqual({ neurodata_type: "RoiResponseSeries" });
    expect(linked?.datasets).toEqual([
      expect.objectContaining({
        name: "timestamps",
        path: "/acquisition/DfOverF/timestamps",
        shape: [10],
        attrs: { unit: "seconds" },
      }),
    ]);
    expect(
      await f.getDatasetData("/acquisition/DfOverF/timestamps", {}),
    ).toEqual(timestamps);
    expect((await f.getDataset("/acquisition/DfOverF/timestamps"))?.path).toBe(
      "/acquisition/DfOverF/timestamps",
    );

    // a linked group: its children carry the link's path
    const processing = await f.getGroup("/processing");
    expect(processing?.subgroups).toEqual([
      {
        name: "Linked",
        path: "/processing/Linked",
        attrs: { neurodata_type: "RoiResponseSeries" },
      },
    ]);
    const through = await f.getGroup("/processing/Linked");
    expect(through?.datasets.map((d) => d.path)).toEqual([
      "/processing/Linked/data",
      "/processing/Linked/rate",
      "/processing/Linked/timestamps",
    ]);
    expect(
      await f.getDatasetData("/processing/Linked/data", { slice: [[0, 1]] }),
    ).toEqual(data.slice(0, 3));
  });

  it("returns scalars, strings, booleans, and 64-bit integers as the HDF5 reader does", async () => {
    const f = open();
    expect(await f.getDatasetData("/acquisition/Corrected/rate", {})).toBe(30);
    expect(await f.getDatasetData("/table/label", {})).toEqual(["a", "bb", ""]);
    expect((await f.getDataset("/table/label"))?.dtype).toBe("|O");
    expect(await f.getDatasetData("/table/valid", {})).toEqual([
      true,
      false,
      true,
    ]);
    expect(await f.getDatasetData("/table/id", {})).toEqual(
      Float64Array.from([5, 6, 7]),
    );
    expect(await f.getDatasetData("/table/id", { allowBigInt: true })).toEqual(
      BigInt64Array.from([5n, 6n, 7n]),
    );
  });

  it("gives object references as the paths they point at", async () => {
    const f = open();
    expect(await f.getDatasetData("/table/group", {})).toEqual([
      { _REFERENCE: { source: ".", path: "/acquisition/Corrected" } },
      { _REFERENCE: { source: ".", path: "/acquisition/DfOverF" } },
    ]);
  });
});

describe("a compound dataset", () => {
  it("is read as rows, with an object reference as the path it points at", async () => {
    const f = open();
    expect((await f.getDataset("/table/timeseries"))?.dtype).toBe("|V");
    const corrected = {
      _REFERENCE: { source: ".", path: "/acquisition/Corrected" },
    };
    const dfOverF = {
      _REFERENCE: { source: ".", path: "/acquisition/DfOverF" },
    };
    expect(await f.getDatasetData("/table/timeseries", {})).toEqual([
      [0, 5, corrected],
      [5, 5, dfOverF],
      [-1, -1, corrected],
    ]);
    expect(
      await f.getDatasetData("/table/timeseries", { slice: [[1, 2]] }),
    ).toEqual([[5, 5, dfOverF]]);
  });
});

describe("a Zarr store written by hdmf-zarr", () => {
  it("reads the same as the references do", async () => {
    vi.stubGlobal("fetch", vi.fn(serve));
    try {
      const fromZarr = await RemoteH5FileZarr3.create(zarrUrl);
      const fromReferences = open();
      for (const path of [
        "/",
        "/acquisition",
        "/acquisition/Corrected",
        "/acquisition/DfOverF",
        "/processing",
        "/processing/Linked",
        "/table",
      ]) {
        expect(await fromZarr.getGroup(path), path).toEqual(
          await fromReferences.getGroup(path),
        );
      }
      for (const path of [
        "/acquisition/Corrected/data",
        "/acquisition/DfOverF/timestamps",
        "/processing/Linked/rate",
        "/table/label",
        "/table/group",
        "/table/valid",
        "/table/timeseries",
      ]) {
        expect(await fromZarr.getDatasetData(path, {}), path).toEqual(
          await fromReferences.getDatasetData(path, {}),
        );
      }
      // The metadata came with the root, so only it and the chunks were fetched
      const fetched = vi
        .mocked(fetch)
        .mock.calls.map(([input]) =>
          (typeof input === "string" ? input : (input as Request).url)
            .split("?")[0]
            .slice(zarrUrl.length + 1),
        );
      expect(fetched.filter((key) => key.endsWith("zarr.json"))).toEqual([
        "zarr.json",
      ]);
    } finally {
      vi.unstubAllGlobals();
      vi.stubGlobal(
        "Worker",
        class {
          postMessage() {}
          addEventListener() {}
          removeEventListener() {}
          terminate() {}
        },
      );
    }
  });

  it("says what is wrong when the store has no consolidated metadata", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 404 })),
    );
    try {
      await expect(
        RemoteH5FileZarr3.create("http://example.test/other.nwb.zarr"),
      ).rejects.toThrow(/not a Zarr store with consolidated metadata/);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe("isZarrUrl", () => {
  it("recognizes a Zarr folder and a Zarr asset in a DANDI bucket", () => {
    for (const url of [
      "https://example.org/data/session.nwb.zarr",
      "https://example.org/data/session.nwb.zarr/",
      "https://dandiarchive.s3.amazonaws.com/zarr/0d6ee8a3-4a2b-4d8c-9e5f-0123456789ab/",
    ]) {
      expect(isZarrUrl(url), url).toBe(true);
    }
    for (const url of [
      "https://example.org/a.nwb",
      "https://example.org/a.nwb.zarrshadow",
      "https://dandiarchive.s3.amazonaws.com/blobs/0d6/ee8/0d6ee8a3-4a2b-4d8c-9e5f-0123456789ab",
    ]) {
      expect(isZarrUrl(url), url).toBe(false);
    }
  });
});

describe("isZarrShadowUrl", () => {
  it("recognizes a reference file or the folder that holds one", () => {
    for (const url of [
      "https://example.org/a.nwb.zarrshadow",
      "https://example.org/a.nwb.zarrshadow/",
      "https://example.org/a.zarrshadow.json",
      "https://example.org/a.nwb.zarrshadow/refs.json?source=neurosift",
    ]) {
      expect(isZarrShadowUrl(url), url).toBe(true);
    }
    for (const url of [
      "https://example.org/a.nwb",
      "https://example.org/a.nwb.lindi.json",
      "https://api.dandiarchive.org/api/assets/abc/download/",
    ]) {
      expect(isZarrShadowUrl(url), url).toBe(false);
    }
  });
});
