import { describe, expect, it, vi } from "vitest";

// The reader's types come from the worker-backed HDF5 reader, which creates a
// web worker when its module is loaded, so a stub is needed to import it in node.
const stubWorker = () =>
  vi.stubGlobal(
    "Worker",
    class {
      postMessage() {}
      addEventListener() {}
      removeEventListener() {}
      terminate() {}
    },
  );
stubWorker();
if (typeof URL.createObjectURL !== "function") {
  URL.createObjectURL = () => "blob:stub";
}
const { default: RemoteH5FileZarr } = await import("./RemoteH5FileZarr");
const { translateArray, translateAttributes } = await import("./zarr2Source");
const { parseJson } = await import("./store");

describe("parseJson", () => {
  it("reads the bare words Python writes for values that are not numbers", () => {
    const parsed = parseJson(
      '{"resolution": NaN, "max": Infinity, "min": -Infinity, "n": 2,' +
        ' "text": "NaN and Infinity stay in a \\"string\\"", "list": [NaN, 1.5]}',
    );
    expect(parsed).toEqual({
      resolution: NaN,
      max: Infinity,
      min: -Infinity,
      n: 2,
      text: 'NaN and Infinity stay in a "string"',
      list: [NaN, 1.5],
    });
  });
});

describe("the earlier conventions of hdmf-zarr", () => {
  it("turns links and references into the form the Zarr v3 files use", () => {
    expect(
      translateAttributes({
        neurodata_type: "TimeSeries",
        zarr_link: [
          {
            name: "timestamps",
            path: "/acquisition/a/timestamps",
            source: ".",
          },
          { name: "elsewhere", path: "/x", source: "other.nwb.zarr" },
        ],
        table: {
          zarr_dtype: "object",
          value: {
            path: "/general/electrodes",
            source: ".",
            object_id: null,
            source_object_id: "abc",
          },
        },
        zarr_dtype: "float64",
      }),
    ).toEqual({
      neurodata_type: "TimeSeries",
      // a link into another file cannot be followed
      _LINKS: [
        { name: "timestamps", source: ".", path: "/acquisition/a/timestamps" },
      ],
      table: { _REFERENCE: { source: ".", path: "/general/electrodes" } },
    });
  });

  it("describes scalars, references, and what cannot be read", () => {
    const zarray = { shape: [1], chunks: [1], dtype: "<f8", filters: null };
    expect(translateArray(zarray, { zarr_dtype: "scalar", unit: "s" })).toEqual(
      expect.objectContaining({
        shape: [],
        scalar: true,
        attributes: { unit: "s" },
      }),
    );
    const objects = { shape: [3], chunks: [3], dtype: "|O" };
    expect(
      translateArray(
        { ...objects, filters: [{ id: "json2" }] },
        { zarr_dtype: "object" },
      ),
    ).toEqual(
      expect.objectContaining({ references: true, unreadable: undefined }),
    );
    expect(
      translateArray(
        { ...objects, filters: [{ id: "pickle", protocol: 5 }] },
        { zarr_dtype: "scalar" },
      ).unreadable,
    ).toMatch(/pickle/);
    expect(
      translateArray(
        { ...objects, filters: [{ id: "pickle" }] },
        { zarr_dtype: [{ name: "idx_start", dtype: "int32" }] },
      ).unreadable,
    ).toBeDefined();
  });
});

// A small Zarr v2 store as hdmf-zarr wrote one: chunks at dotted keys, and the
// metadata of every node in .zmetadata, with a NaN as Python writes it.
const base = "http://example.test/zarr/0d6ee8a3-4a2b-4d8c-9e5f-0123456789ab";
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
const bytesOf = (values: ArrayBufferView) =>
  new Uint8Array(values.buffer, values.byteOffset, values.byteLength);
const zarray = (
  shape: number[],
  dtype: string,
  filters: object[] | null = null,
) => ({
  zarr_format: 2,
  shape,
  chunks: shape,
  dtype,
  compressor: null,
  fill_value: dtype === "|O" ? 0 : 0.0,
  filters,
  order: "C",
});
const timestamps = Float64Array.from({ length: 5 }, (_, i) => i * 0.5);
const data = Int16Array.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
const zmetadata = `{"zarr_consolidated_format": 1, "metadata": ${JSON.stringify(
  {
    ".zgroup": { zarr_format: 2 },
    ".zattrs": { nwb_version: "2.7.0" },
    "acquisition/.zgroup": { zarr_format: 2 },
    "acquisition/a/.zgroup": { zarr_format: 2 },
    "acquisition/a/.zattrs": { neurodata_type: "TimeSeries" },
    "acquisition/a/data/.zarray": zarray([5, 2], "<i2"),
    "acquisition/a/data/.zattrs": { zarr_dtype: "int16", resolution: "@NAN@" },
    "acquisition/a/timestamps/.zarray": zarray([5], "<f8"),
    "acquisition/a/timestamps/.zattrs": { zarr_dtype: "float64" },
    "acquisition/a/starting_time/.zarray": zarray([1], "<f8"),
    "acquisition/a/starting_time/.zattrs": { zarr_dtype: "scalar", rate: 2.0 },
    "acquisition/b/.zgroup": { zarr_format: 2 },
    "acquisition/b/.zattrs": {
      neurodata_type: "TimeSeries",
      zarr_link: [
        { name: "timestamps", path: "/acquisition/a/timestamps", source: "." },
      ],
    },
    "table/.zgroup": { zarr_format: 2 },
    "table/label/.zarray": zarray([3], "|O", [{ id: "vlen-utf8" }]),
    "table/label/.zattrs": { zarr_dtype: "str" },
    "table/created/.zarray": zarray([1], "|O", [{ id: "vlen-bytes" }]),
    "table/created/.zattrs": { zarr_dtype: "bytes" },
    "table/group/.zarray": zarray([2], "|O", [{ id: "json2" }]),
    "table/group/.zattrs": { zarr_dtype: "object" },
    "table/pickled/.zarray": zarray([1], "|O", [{ id: "pickle", protocol: 5 }]),
    "table/pickled/.zattrs": { zarr_dtype: "scalar" },
    "table/empty/.zarray": zarray([0], "<f8"),
    "table/empty/.zattrs": { zarr_dtype: "float64" },
  },
).replace('"@NAN@"', "NaN")}}`;
const chunks = new Map<string, Uint8Array>([
  ["acquisition/a/data/0.0", bytesOf(data)],
  ["acquisition/a/timestamps/0", bytesOf(timestamps)],
  // starting_time is 0, the fill value, so its chunk was never written
  ["table/label/0", vlenUtf8(["a", "bb", ""])],
  ["table/created/0", vlenUtf8(["2026-01-01T00:00:00"])],
  [
    "table/group/0",
    new TextEncoder().encode(
      JSON.stringify([
        { path: "/acquisition/a", source: ".", object_id: null },
        { path: "/acquisition/b", source: ".", object_id: null },
        "|O",
        [2],
      ]),
    ),
  ],
]);
const serve = async (input: RequestInfo | URL) => {
  const url = typeof input === "string" ? input : (input as Request).url;
  const key = url.split("?")[0].slice(base.length + 1);
  if (key === ".zmetadata") return new Response(zmetadata, { status: 200 });
  const body = chunks.get(key);
  return body
    ? new Response(body, { status: 200 })
    : new Response(null, { status: 404 });
};

describe("a Zarr v2 store written by hdmf-zarr", () => {
  it("reads through the same interface", async () => {
    vi.stubGlobal("fetch", vi.fn(serve));
    try {
      const f = await RemoteH5FileZarr.create(base);
      const root = await f.getGroup("/");
      expect(root?.attrs).toEqual({ nwb_version: "2.7.0" });
      expect(root?.subgroups.map((g) => g.path)).toEqual([
        "/acquisition",
        "/table",
      ]);

      const a = await f.getGroup("/acquisition/a");
      expect(a?.datasets.map((d) => [d.name, d.dtype, d.shape])).toEqual([
        ["data", "<i2", [5, 2]],
        ["starting_time", "<f8", []],
        ["timestamps", "<f8", [5]],
      ]);
      // the attribute Python wrote as NaN, and no zarr_dtype
      expect(a?.datasets[0].attrs).toEqual({ resolution: NaN });
      expect(await f.getDatasetData("/acquisition/a/data", {})).toEqual(data);
      expect(
        await f.getDatasetData("/acquisition/a/data", { slice: [[1, 3]] }),
      ).toEqual(data.slice(2, 6));
      // a scalar is the value itself, here the fill value of a chunk that was never written
      expect(await f.getDatasetData("/acquisition/a/starting_time", {})).toBe(
        0,
      );

      // a link is followed, and listed under its own path
      const b = await f.getGroup("/acquisition/b");
      expect(b?.datasets.map((d) => d.path)).toEqual([
        "/acquisition/b/timestamps",
      ]);
      expect(await f.getDatasetData("/acquisition/b/timestamps", {})).toEqual(
        timestamps,
      );

      expect(await f.getDatasetData("/table/label", {})).toEqual([
        "a",
        "bb",
        "",
      ]);
      expect(await f.getDatasetData("/table/created", {})).toEqual([
        "2026-01-01T00:00:00",
      ]);
      expect(await f.getDatasetData("/table/group", {})).toEqual([
        { _REFERENCE: { source: ".", path: "/acquisition/a" } },
        { _REFERENCE: { source: ".", path: "/acquisition/b" } },
      ]);
      expect(await f.getDatasetData("/table/empty", {})).toEqual([]);

      // Python pickles cannot be read in a browser
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      expect(await f.getDatasetData("/table/pickled", {})).toBeUndefined();
      expect(warn).toHaveBeenCalledWith(
        expect.stringMatching(
          /pickled cannot be read: its values are Python pickles/,
        ),
      );
      warn.mockRestore();

      // only .zmetadata was fetched for metadata
      const fetched = vi
        .mocked(fetch)
        .mock.calls.map(([input]) =>
          (typeof input === "string" ? input : (input as Request).url)
            .split("?")[0]
            .slice(base.length + 1),
        );
      expect(fetched.filter((key) => key.includes(".z"))).toEqual([
        ".zmetadata",
      ]);
    } finally {
      vi.unstubAllGlobals();
      stubWorker();
    }
  });
});
