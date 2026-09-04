import { describe, expect, it, vi } from "vitest";

// The loader's module graph reaches the worker-backed HDF5 reader, which
// creates a web worker at import time, so stub it out for node.
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
const { default: zarrDecodeChunkArray } =
  await import("./zarrDecodeChunkArray");
const { default: lindiDatasetDataLoader } =
  await import("./lindiDatasetDataLoader");

// Values that do not fit in 32 bits, like nanosecond timestamps.
const bigValues = [0n, 2147483648n, -2147483649n, 3000000000n, 2n ** 53n];
const bigNumbers = bigValues.map((v) => Number(v));

describe("zarrDecodeChunkArray with 64-bit integers", () => {
  it("decodes <i8 chunks to Float64Array without wrapping", async () => {
    const buf = new BigInt64Array(bigValues).buffer;
    const out = await zarrDecodeChunkArray(buf, "<i8", undefined, undefined, [
      bigValues.length,
    ]);
    expect(out).toBeInstanceOf(Float64Array);
    expect(Array.from(out)).toEqual(bigNumbers);
  });

  it("decodes <u8 chunks to Float64Array without wrapping", async () => {
    const values = [0n, 4294967296n, 2n ** 53n];
    const buf = new BigUint64Array(values).buffer;
    const out = await zarrDecodeChunkArray(buf, "<u8", undefined, undefined, [
      values.length,
    ]);
    expect(out).toBeInstanceOf(Float64Array);
    expect(Array.from(out)).toEqual(values.map((v) => Number(v)));
  });
});

describe("lindiDatasetDataLoader with 64-bit integers", () => {
  it("reads a contiguous single-chunk <i8 dataset by byte range as numbers", async () => {
    // No compressor and one chunk, so the loader fetches a byte range and
    // interprets it directly. Previously this returned a BigInt64Array.
    const values = new BigInt64Array(bigValues);
    const client = {
      readBinary: async (
        path: string,
        o: { decodeArray?: boolean; startByte?: number; endByte?: number },
      ) => {
        expect(path).toBe("t/0");
        expect(o.decodeArray).toBe(false);
        return values.buffer.slice(o.startByte ?? 0, o.endByte);
      },
    };
    const out = await lindiDatasetDataLoader({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      client: client as any,
      path: "t",
      zarray: { shape: [5], chunks: [5], dtype: "<i8", zarr_format: 2 },
      slice: [[1, 4]],
    });
    expect(out).toBeInstanceOf(Float64Array);
    expect(Array.from(out as Float64Array)).toEqual(bigNumbers.slice(1, 4));
  });

  it("reads a 2-D contiguous <i8 dataset sliced in both dimensions", async () => {
    // Previously this path threw when assigning a BigInt into an Int32Array.
    const shape = [4, 3];
    const values = new BigInt64Array(12);
    for (let i = 0; i < 12; i++) values[i] = 3000000000n + BigInt(i);
    const client = {
      readBinary: async (
        _path: string,
        o: { startByte?: number; endByte?: number },
      ) => values.buffer.slice(o.startByte ?? 0, o.endByte),
    };
    const out = await lindiDatasetDataLoader({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      client: client as any,
      path: "t",
      zarray: { shape, chunks: shape, dtype: "<i8", zarr_format: 2 },
      slice: [
        [1, 3],
        [0, 2],
      ],
    });
    expect(out).toBeInstanceOf(Float64Array);
    expect(Array.from(out as Float64Array)).toEqual(
      [3, 4, 6, 7].map((i) => 3000000000 + i),
    );
  });

  it("assembles <i8 data across chunks without wrapping", async () => {
    // Two chunks along the first dimension exercise the allocate-and-copy
    // path, which used to allocate an Int32Array for <i8.
    const shape = [4];
    const chunks: { [path: string]: Float64Array } = {
      "t/0": new Float64Array([3000000000, 3000000001]),
      "t/1": new Float64Array([3000000002, 3000000003]),
    };
    const client = {
      readBinary: async (path: string) => chunks[path],
    };
    const out = await lindiDatasetDataLoader({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      client: client as any,
      path: "t",
      zarray: {
        shape,
        chunks: [2],
        dtype: "<i8",
        zarr_format: 2,
        compressor: { id: "zlib" },
      },
      slice: [[1, 4]],
    });
    expect(out).toBeInstanceOf(Float64Array);
    expect(Array.from(out as Float64Array)).toEqual([
      3000000001, 3000000002, 3000000003,
    ]);
  });
});
