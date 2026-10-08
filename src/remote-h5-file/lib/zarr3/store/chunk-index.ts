import * as zarr from "zarrita";
import type { Readable } from "zarrita";

const MISSING = 2n ** 64n - 1n;

/**
 * Chunk byte ranges for one array with many chunks.
 *
 * The index is a Zarr v3 array of uint64 with shape (...chunk grid, 2)
 * holding (offset, length) for each chunk, stored next to refs.json. It is
 * opened on the first lookup, and only the index chunks that cover the
 * requested data chunks are read.
 */
export class ChunkIndex {
  #array: Promise<zarr.Array<zarr.DataType, Readable>> | undefined;
  #blocks = new Map<string, Promise<BigUint64Array>>();

  constructor(
    /** The file that holds every chunk of the array. */
    readonly url: string,
    readonly store: Readable,
    /** The index array's path in store. */
    readonly path: string,
    readonly maxCachedBlocks = 64,
  ) {
    const parts = path.split("/");
    if (path.startsWith("/") || parts.includes("..") || path.includes("://")) {
      throw new Error(
        `index path must be relative to refs.json: ${JSON.stringify(path)}`,
      );
    }
  }

  /** The (offset, length) of the chunk at coords, or undefined if it was never written. */
  async lookup(coords: number[]): Promise<[number, number] | undefined> {
    this.#array ??= zarr.open.v3(zarr.root(this.store).resolve(this.path), {
      kind: "array",
    });
    const array = await this.#array;
    const grid = array.shape.slice(0, -1);
    if (
      coords.length !== grid.length ||
      coords.some((c, i) => !(c >= 0 && c < (grid[i] as number)))
    ) {
      return undefined;
    }
    const blockShape = array.chunks.slice(0, -1);
    const block = coords.map((c, i) =>
      Math.floor(c / (blockShape[i] as number)),
    );
    const data = await this.#block(array, block);
    let position = 0;
    for (const [i, c] of coords.entries()) {
      position =
        position * (blockShape[i] as number) + (c % (blockShape[i] as number));
    }
    const offset = data[2 * position] as bigint;
    const length = data[2 * position + 1] as bigint;
    if (offset === MISSING) return undefined;
    return [Number(offset), Number(length)];
  }

  #block(
    array: zarr.Array<zarr.DataType, Readable>,
    block: number[],
  ): Promise<BigUint64Array> {
    const id = block.join("/");
    let loading = this.#blocks.get(id);
    if (loading) {
      this.#blocks.delete(id); // moved to the end below, as the most recently used
    } else {
      loading = array.getChunk([...block, 0]).then((chunk) => {
        if (!(chunk.data instanceof BigUint64Array)) {
          throw new Error(
            `The chunk index at ${this.path} is not a uint64 array`,
          );
        }
        return chunk.data;
      });
      loading.catch(() => this.#blocks.delete(id));
    }
    this.#blocks.set(id, loading);
    while (this.#blocks.size > this.maxCachedBlocks) {
      this.#blocks.delete(this.#blocks.keys().next().value as string);
    }
    return loading;
  }
}
