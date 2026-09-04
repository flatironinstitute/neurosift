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
const { default: lindiDatasetDataLoader } =
  await import("./lindiDatasetDataLoader");

const prod = (a: number[]) => a.reduce((x, y) => x * y, 1);

const rowMajorStrides = (shape: number[]) => {
  const strides = new Array(shape.length).fill(1);
  for (let d = shape.length - 2; d >= 0; d--) {
    strides[d] = strides[d + 1] * shape[d + 1];
  }
  return strides;
};

const unravel = (i: number, shape: number[]) => {
  const index = new Array(shape.length).fill(0);
  let rem = i;
  for (let d = shape.length - 1; d >= 0; d--) {
    index[d] = rem % shape[d];
    rem = Math.floor(rem / shape[d]);
  }
  return index;
};

// Build an in-memory chunk store for an array whose value at each position is
// its flat row-major index. Chunks are stored at full chunk size with zero
// padding beyond the array edge, as HDF5 and zarr store them, so a loader that
// uses chunk strides where it should use array strides reads padding.
const makeChunkStore = (
  shape: number[],
  chunkShape: number[],
  dtype: "<f4" | "<i4",
) => {
  const macro = chunkShape.map((cs, d) => Math.ceil(shape[d] / cs));
  const shapeStrides = rowMajorStrides(shape);
  const chunks: { [path: string]: Float32Array | Int32Array } = {};
  const numChunks = prod(macro);
  for (let ci = 0; ci < numChunks; ci++) {
    const c = unravel(ci, macro);
    const arr =
      dtype === "<f4"
        ? new Float32Array(prod(chunkShape))
        : new Int32Array(prod(chunkShape));
    for (let k = 0; k < arr.length; k++) {
      const local = unravel(k, chunkShape);
      let inside = true;
      let flat = 0;
      for (let d = 0; d < shape.length; d++) {
        const g = c[d] * chunkShape[d] + local[d];
        if (g >= shape[d]) {
          inside = false;
          break;
        }
        flat += g * shapeStrides[d];
      }
      arr[k] = inside ? flat : 0;
    }
    chunks["x/" + c.join(".")] = arr;
  }
  const readPaths: string[] = [];
  const client = {
    readBinary: async (path: string, o: { decodeArray?: boolean }) => {
      if (!o.decodeArray) throw Error("Unexpected raw read of " + path);
      readPaths.push(path);
      return chunks[path];
    },
  };
  const zarray = {
    zarr_format: 2 as const,
    shape,
    chunks: chunkShape,
    dtype,
    // A compressor keeps the loader off the single contiguous block path,
    // which reads byte ranges rather than decoded chunks.
    compressor: { id: "zlib", level: 4 },
    filters: [],
    fill_value: 0,
    order: "C" as const,
  };
  return { client, zarray, readPaths };
};

// Expected values for a slice of the first up-to-three dimensions, computed
// straight from the flat index formula.
const expectedSlice = (shape: number[], slice: [number, number][]) => {
  const strides = rowMajorStrides(shape);
  const full: [number, number][] = shape.map((n, d) =>
    d < slice.length ? slice[d] : [0, n],
  );
  const out: number[] = [];
  const rec = (d: number, base: number) => {
    if (d === shape.length) {
      out.push(base);
      return;
    }
    for (let i = full[d][0]; i < full[d][1]; i++) {
      rec(d + 1, base + i * strides[d]);
    }
  };
  rec(0, 0);
  return out;
};

const load = async (
  shape: number[],
  chunkShape: number[],
  slice: [number, number][],
  dtype: "<f4" | "<i4" = "<f4",
) => {
  const { client, zarray, readPaths } = makeChunkStore(
    shape,
    chunkShape,
    dtype,
  );
  const result = await lindiDatasetDataLoader({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    client: client as any,
    path: "x",
    zarray,
    slice,
  });
  return { result: Array.from(result as ArrayLike<number>), readPaths };
};

describe("lindiDatasetDataLoader", () => {
  it("reads a 1-D array across chunks", async () => {
    const { result } = await load([10], [4], [[1, 9]]);
    expect(result).toEqual(expectedSlice([10], [[1, 9]]));
  });

  it("reads a 2-D slice across chunks in both dimensions", async () => {
    const shape = [5, 6];
    const chunks = [2, 4];
    const slice: [number, number][] = [
      [1, 5],
      [1, 6],
    ];
    const { result } = await load(shape, chunks, slice);
    expect(result).toEqual(expectedSlice(shape, slice));
  });

  it("uses a contiguous slice when the chunk layout matches the array", async () => {
    const shape = [2, 3, 8];
    const chunks = [1, 3, 8];
    const slice: [number, number][] = [
      [1, 2],
      [0, 3],
    ];
    const { result, readPaths } = await load(shape, chunks, slice);
    expect(result).toEqual(expectedSlice(shape, slice));
    expect(readPaths).toEqual(["x/1.0.0"]);
  });

  it("handles a padded single chunk in the third dimension", async () => {
    // Chunk is wider than the array in the last dimension, so chunk rows are
    // longer than array rows and a contiguous slice would include padding.
    const shape = [4, 5, 7];
    const chunks = [2, 5, 8];
    const slice: [number, number][] = [
      [1, 3],
      [0, 5],
    ];
    const { result } = await load(shape, chunks, slice);
    expect(result.length).toBe(2 * 5 * 7);
    expect(result).toEqual(expectedSlice(shape, slice));
  });

  it("concatenates several chunks along the third dimension that divide the shape evenly", async () => {
    const shape = [2, 3, 8];
    const chunks = [1, 3, 4];
    const slice: [number, number][] = [
      [0, 2],
      [0, 3],
    ];
    const { result } = await load(shape, chunks, slice);
    expect(result).toEqual(expectedSlice(shape, slice));
  });

  it("concatenates several chunks along the third dimension when the last chunk is partial", async () => {
    // Like an image stack of shape [T, H, W] chunked [1, H, 4] with W = 10.
    const shape = [3, 4, 10];
    const chunks = [1, 4, 4];
    const slice: [number, number][] = [
      [1, 2],
      [0, 4],
    ];
    const { result } = await load(shape, chunks, slice);
    expect(result.length).toBe(1 * 4 * 10);
    expect(result).toEqual(expectedSlice(shape, slice));
  });

  it("slices the second dimension while concatenating trailing chunks", async () => {
    const shape = [3, 4, 10];
    const chunks = [1, 4, 4];
    const slice: [number, number][] = [
      [0, 3],
      [1, 3],
    ];
    const { result } = await load(shape, chunks, slice);
    expect(result).toEqual(expectedSlice(shape, slice));
  });

  it("handles chunks along two trailing dimensions with padding in both", async () => {
    const shape = [2, 3, 5, 6];
    const chunks = [1, 3, 2, 4];
    const slice: [number, number][] = [
      [0, 2],
      [0, 3],
    ];
    const { result } = await load(shape, chunks, slice);
    expect(result.length).toBe(2 * 3 * 5 * 6);
    expect(result).toEqual(expectedSlice(shape, slice));
  });

  it("handles a 4-D array chunked in every dimension", async () => {
    const shape = [3, 5, 5, 6];
    const chunks = [2, 2, 2, 4];
    const slice: [number, number][] = [
      [1, 3],
      [1, 4],
    ];
    const { result } = await load(shape, chunks, slice, "<i4");
    expect(result).toEqual(expectedSlice(shape, slice));
  });

  it("supports a third slice dimension on top of trailing chunks", async () => {
    const shape = [3, 4, 10];
    const chunks = [1, 4, 4];
    const slice: [number, number][] = [
      [0, 3],
      [0, 4],
      [2, 7],
    ];
    const { result } = await load(shape, chunks, slice);
    expect(result).toEqual(expectedSlice(shape, slice));
  });

  it("supports a third slice dimension on a 4-D array", async () => {
    const shape = [2, 3, 5, 6];
    const chunks = [1, 3, 2, 4];
    const slice: [number, number][] = [
      [0, 2],
      [1, 3],
      [1, 4],
    ];
    const { result } = await load(shape, chunks, slice);
    expect(result).toEqual(expectedSlice(shape, slice));
  });
});
