import * as zarr from "zarrita";
import type {
  AbsolutePath,
  AsyncReadable,
  GetOptions,
  RangeQuery,
  Readable,
} from "zarrita";

import { ChunkIndex } from "./chunk-index";
import { registerCodecs } from "./codecs";
import { dandiUrlResolver } from "./dandi";
import { type FileRef, type GenEntry, Generator } from "./gen";
import { Selection } from "./selection";

/** A reference: inline text or base64, inline JSON, or a place in a file. */
export type Ref = string | Record<string, unknown> | FileRef;

/** The contents of a zarrshadow reference file (refs.json). */
export interface ReferenceFileSystem {
  version?: number;
  refs: Record<string, Ref>;
  templates?: Record<string, string>;
  gen?: GenEntry[];
  indexes?: Record<string, { url: string; index: string }>;
  selections?: Record<string, { record_size: number; keep: number[][] }>;
  sources?: Record<string, { size?: number; etag?: string }>;
}

export interface ReferenceStoreOptions {
  /**
   * The store that holds the chunk index arrays named under "indexes": the
   * folder refs.json is in. Needed only for references that have indexes.
   */
  indexStore?: Readable;
  /** Used for every request to a source file. Defaults to the global fetch. */
  fetch?: (input: string, init?: RequestInit) => Promise<Response>;
  /**
   * Turns the URL in a reference into the one to request. The default follows
   * the redirect of a DANDI asset download URL once and reuses the result for
   * ten minutes.
   */
  resolveUrl?: (url: string) => string | Promise<string>;
  /** Reads a reference that is a local path, which a browser cannot. See zarrshadow/node. */
  readFile?: (
    path: string,
    offset?: number,
    length?: number,
  ) => Promise<Uint8Array>;
  /** The size of a local file, to check it against the recorded one. */
  fileSize?: (path: string) => Promise<number>;
  /**
   * Check reads against the size and ETag recorded under "sources", and throw
   * SourceChangedError when a file has changed. Requests then carry If-Match,
   * which a server must allow in its CORS configuration for a browser to send.
   * Default true.
   */
  validateSources?: boolean;
  /** How many times a failed request is tried again. Default 5. */
  retries?: number;
  /**
   * Requests made at the same time for parts of one file are fetched together
   * when the gap between them is at most this many bytes. zarrita asks for
   * every chunk of a selection at once, so chunks that are next to one another
   * in a file can share a request. Default 32 KiB.
   */
  mergeGap?: number;
  /**
   * The most bytes one merged request may ask for. 0 turns merging off.
   * Default 1 MiB, which bundles small chunks and still leaves large reads
   * to several requests in parallel. One request for everything is slower.
   */
  maxMergeSize?: number;
}

/** A read of part of a file that is waiting to be sent, alone or with its neighbors. */
interface PendingRead {
  offset: number;
  length: number;
  signal?: AbortSignal;
  resolve: (bytes: Uint8Array) => void;
  reject: (reason: unknown) => void;
}

/** A referenced file no longer matches the one the references were made from. */
export class SourceChangedError extends Error {
  override name = "SourceChangedError";
}

const SUPPORTED_VERSIONS = [1, 2];
const DEFAULT_MAX_MERGE_SIZE = 2 ** 20;
const ITEM_SIZES: Record<string, number> = {
  int8: 1,
  uint8: 1,
  int16: 2,
  uint16: 2,
  float16: 2,
  int32: 4,
  uint32: 4,
  float32: 4,
  int64: 8,
  uint64: 8,
  float64: 8,
};

function isUrl(location: string): boolean {
  return location.startsWith("http://") || location.startsWith("https://");
}

function decodeBase64(text: string): Uint8Array {
  const binary = atob(text);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** The path of the array a chunk key belongs to, or undefined for any other key. */
export function arrayPath(key: string): string | undefined {
  let head: string;
  let tail: string;
  const at = key.lastIndexOf("/c/");
  if (at >= 0) {
    head = key.slice(0, at);
    tail = key.slice(at + 3);
  } else if (key.startsWith("c/")) {
    head = "";
    tail = key.slice(2);
  } else {
    return undefined;
  }
  if (tail === "" || !tail.split("/").every((part) => /^\d+$/.test(part)))
    return undefined;
  return head;
}

/** The [start, stop) that a range query covers in a value of total bytes. */
function bounds(range: RangeQuery, total: number): [number, number] {
  const clamp = (n: number) => Math.max(0, Math.min(n, total));
  if ("suffixLength" in range)
    return [clamp(total - range.suffixLength), total];
  return [clamp(range.offset), clamp(range.offset + range.length)];
}

/**
 * The size in bytes of one value of a data type, if it is one whose short
 * chunks are padded. A struct lists its fields as objects; its earlier name,
 * structured, lists them as [name, type] pairs.
 */
export function itemSize(dataType: unknown): number | undefined {
  if (typeof dataType === "string") return ITEM_SIZES[dataType];
  const type = dataType as {
    name?: string;
    configuration?: { fields?: unknown[]; length_bytes?: number };
  };
  if (
    type?.name === "null_terminated_bytes" ||
    type?.name === "fixed_length_utf32"
  ) {
    return type.configuration?.length_bytes;
  }
  if (
    (type?.name !== "struct" && type?.name !== "structured") ||
    !type.configuration?.fields
  )
    return undefined;
  let total = 0;
  for (const field of type.configuration.fields) {
    const size = itemSize(
      Array.isArray(field)
        ? field[1]
        : (field as { data_type?: unknown }).data_type,
    );
    if (size === undefined) return undefined;
    total += size;
  }
  return total;
}

/**
 * A read-only zarrita store over a zarrshadow reference file.
 *
 * Keys are looked up in "refs", then in the chunk index of their array, then
 * in the "gen" entries. A reference into a file is read with a range request,
 * the array's selection is applied if it has one, and a short last chunk of
 * an uncompressed array is padded.
 *
 * ```ts
 * import * as zarr from "zarrita";
 * import { ReferenceStore } from "zarrshadow";
 *
 * const store = await ReferenceStore.fromUrl("https://example.org/session.nwb.zarrshadow");
 * const array = await zarr.open.v3(zarr.root(store).resolve("acquisition/ElectricalSeries/data"), { kind: "array" });
 * const first = await zarr.get(array, [zarr.slice(0, 30000), null]);
 * ```
 */
export class ReferenceStore implements AsyncReadable {
  readonly rfs: ReferenceFileSystem;
  #options: ReferenceStoreOptions;
  #fetch: (input: string, init?: RequestInit) => Promise<Response>;
  #resolveUrl: (url: string) => string | Promise<string>;
  #sources: Record<string, { size?: number; etag?: string }>;
  #indexes = new Map<string, ChunkIndex>();
  #generators: Generator[];
  #selections = new Map<string, Selection>();
  #chunkSizes = new Map<string, number | undefined>();
  #checkedFiles = new Map<string, Promise<void>>();
  #pending = new Map<string, PendingRead[]>();
  #children: Map<string, Set<string>> | undefined;

  constructor(rfs: ReferenceFileSystem, options: ReferenceStoreOptions = {}) {
    if (!rfs || typeof rfs.refs !== "object")
      throw new Error('A reference file system needs a "refs" entry');
    if (
      rfs.version !== undefined &&
      !SUPPORTED_VERSIONS.includes(rfs.version)
    ) {
      throw new Error(`Unknown reference file version: ${rfs.version}`);
    }
    registerCodecs();
    this.rfs = rfs;
    this.#options = options;
    this.#fetch = options.fetch ?? ((input, init) => fetch(input, init));
    this.#resolveUrl = options.resolveUrl ?? dandiUrlResolver(this.#fetch);
    this.#sources =
      options.validateSources === false ? {} : (rfs.sources ?? {});
    for (const [path, entry] of Object.entries(rfs.indexes ?? {})) {
      if (!options.indexStore) {
        throw new Error(
          "These references have chunk indexes; pass indexStore, the folder that refs.json is in",
        );
      }
      this.#indexes.set(
        path,
        new ChunkIndex(entry.url, options.indexStore, entry.index),
      );
    }
    this.#generators = (rfs.gen ?? []).map(
      (entry) => new Generator(entry, rfs.templates),
    );
    for (const [path, entry] of Object.entries(rfs.selections ?? {})) {
      this.#selections.set(path, new Selection(entry));
    }
  }

  /**
   * Open references at a URL: a refs.json file, or the folder that holds one
   * together with its chunk indexes.
   */
  static async fromUrl(
    location: string,
    options: ReferenceStoreOptions = {},
  ): Promise<ReferenceStore> {
    const jsonUrl = location.endsWith(".json")
      ? location
      : `${location.replace(/\/+$/, "")}/refs.json`;
    const fetch_ =
      options.fetch ??
      ((input: string, init?: RequestInit) => fetch(input, init));
    const response = await fetch_(jsonUrl);
    if (!response.ok)
      throw new Error(`Could not read ${jsonUrl}: HTTP ${response.status}`);
    const rfs = (await response.json()) as ReferenceFileSystem;
    const folder = jsonUrl.slice(0, jsonUrl.lastIndexOf("/"));
    const indexStore = new zarr.FetchStore(
      folder,
      options.fetch ? { fetch: (request) => fetch_(request.url, request) } : {},
    );
    return new ReferenceStore(rfs, { indexStore, ...options });
  }

  async get(
    key: AbsolutePath,
    opts: GetOptions = {},
  ): Promise<Uint8Array | undefined> {
    return this.#read(key.replace(/^\/+/, ""), undefined, opts);
  }

  async getRange(
    key: AbsolutePath,
    range: RangeQuery,
    opts: GetOptions = {},
  ): Promise<Uint8Array | undefined> {
    return this.#read(key.replace(/^\/+/, ""), range, opts);
  }

  /** The names of the groups and arrays directly inside the group at path. */
  children(path = ""): string[] {
    if (!this.#children) {
      this.#children = new Map();
      for (const key of Object.keys(this.rfs.refs)) {
        if (!key.endsWith("/zarr.json")) continue;
        const node = key.slice(0, -"/zarr.json".length);
        const cut = node.lastIndexOf("/");
        const parent = cut < 0 ? "" : node.slice(0, cut);
        if (!this.#children.has(parent)) this.#children.set(parent, new Set());
        this.#children.get(parent)?.add(node.slice(cut + 1));
      }
    }
    return [
      ...(this.#children.get(path.replace(/^\/+|\/+$/g, "")) ?? []),
    ].sort();
  }

  /** The reference for key: inline text or JSON, or a place in a file. */
  async resolve(key: string): Promise<Ref | undefined> {
    const ref = this.rfs.refs[key];
    if (ref !== undefined && ref !== null) return ref;
    if (this.#indexes.size > 0) {
      const path = arrayPath(key);
      const index = path === undefined ? undefined : this.#indexes.get(path);
      if (index && path !== undefined) {
        const coords = key
          .slice(path === "" ? 2 : path.length + 3)
          .split("/")
          .map(Number);
        const hit = await index.lookup(coords);
        return hit && [index.url, hit[0], hit[1]];
      }
    }
    for (const generator of this.#generators) {
      const generated = generator.lookup(key);
      if (generated) return generated;
    }
    return undefined;
  }

  async #read(
    key: string,
    range: RangeQuery | undefined,
    opts: GetOptions,
  ): Promise<Uint8Array | undefined> {
    const ref = await this.resolve(key);
    if (ref === undefined) return undefined;
    if (!Array.isArray(ref)) {
      let data: Uint8Array;
      if (typeof ref !== "string")
        data = new TextEncoder().encode(JSON.stringify(ref));
      else if (ref.startsWith("base64:"))
        data = decodeBase64(ref.slice("base64:".length));
      else data = new TextEncoder().encode(ref);
      return range ? data.subarray(...bounds(range, data.length)) : data;
    }
    const location = this.#expandTemplates(ref[0]);
    const selection = this.#selectionFor(key);
    if (ref.length !== 3) {
      const whole = await this.#finish(
        key,
        await this.#readSource(location, undefined, undefined, opts),
        selection,
      );
      return range ? whole.subarray(...bounds(range, whole.length)) : whole;
    }
    const [, offset, length] = ref;
    if (!range)
      return this.#finish(
        key,
        await this.#readSource(location, offset, length, opts),
        selection,
      );

    // Part of a chunk: fetch only the bytes of the file that hold it
    const stored = selection ? selection.selectedSize(length) : length;
    const total = Math.max(stored, (await this.#chunkSize(key)) ?? 0);
    const [start, stop] = bounds(range, total);
    const out = new Uint8Array(stop - start); // what lies past the stored bytes is padding
    const available = Math.min(stop, stored);
    if (start < available) {
      if (!selection) {
        out.set(
          await this.#readSource(
            location,
            offset + start,
            available - start,
            opts,
          ),
        );
      } else {
        const source = selection.sourceRange(start, available);
        const records = await this.#readSource(
          location,
          offset + source.offset,
          source.length,
          opts,
        );
        out.set(
          selection
            .apply(records)
            .subarray(source.skip, source.skip + available - start),
        );
      }
    }
    return out;
  }

  /** Turn the bytes of a reference into the chunk a reader decodes. */
  async #finish(
    key: string,
    data: Uint8Array,
    selection: Selection | undefined,
  ): Promise<Uint8Array> {
    if (selection) data = selection.apply(data);
    const size = await this.#chunkSize(key);
    if (size === undefined || data.length >= size) return data;
    const padded = new Uint8Array(size);
    padded.set(data);
    return padded;
  }

  #selectionFor(key: string): Selection | undefined {
    if (this.#selections.size === 0) return undefined;
    const path = arrayPath(key);
    return path === undefined ? undefined : this.#selections.get(path);
  }

  #expandTemplates(location: string): string {
    if (!location.includes("{{") || !this.rfs.templates) return location;
    for (const [name, value] of Object.entries(this.rfs.templates)) {
      location = location.split(`{{${name}}}`).join(value);
    }
    return location;
  }

  /**
   * The full size of a chunk of the array that key belongs to, if a short
   * chunk of it is to be padded. Only uncompressed chunks are padded: the last
   * chunk of a contiguous dataset stops where the data does.
   */
  async #chunkSize(key: string): Promise<number | undefined> {
    const path = arrayPath(key);
    if (path === undefined) return undefined;
    if (this.#chunkSizes.has(path)) return this.#chunkSizes.get(path);
    let size: number | undefined;
    const bytes = await this.#read(
      path === "" ? "zarr.json" : `${path}/zarr.json`,
      undefined,
      {},
    );
    if (bytes) {
      const meta = JSON.parse(new TextDecoder().decode(bytes));
      const chunkShape: number[] | undefined =
        meta.chunk_grid?.configuration?.chunk_shape;
      const uncompressed = (meta.codecs ?? []).every(
        (codec: { name?: string }) => codec.name === "bytes",
      );
      const item = itemSize(meta.data_type);
      if (
        meta.node_type === "array" &&
        uncompressed &&
        chunkShape &&
        item !== undefined
      ) {
        size = chunkShape.reduce((a, b) => a * b, 1) * item;
      }
    }
    this.#chunkSizes.set(path, size);
    return size;
  }

  async #readSource(
    location: string,
    offset: number | undefined,
    length: number | undefined,
    opts: GetOptions,
  ): Promise<Uint8Array> {
    if (length === 0) return new Uint8Array(0);
    if (isUrl(location)) {
      const merging =
        (this.#options.maxMergeSize ?? DEFAULT_MAX_MERGE_SIZE) > 0;
      if (!merging || offset === undefined || length === undefined) {
        return this.#readUrl(location, offset, length, opts);
      }
      // Wait for the other reads that are being asked for right now, and send them together
      return new Promise((resolve, reject) => {
        if (this.#pending.size === 0) setTimeout(() => this.#sendPending(), 0);
        if (!this.#pending.has(location)) this.#pending.set(location, []);
        this.#pending
          .get(location)
          ?.push({ offset, length, signal: opts.signal, resolve, reject });
      });
    }
    if (!this.#options.readFile) {
      throw new Error(
        `${location} is a local path; pass readFile (see zarrshadow/node) to read it`,
      );
    }
    await this.#checkFile(location);
    return this.#options.readFile(location, offset, length);
  }

  /** Send the reads that are waiting, one request for each run of reads that are close together in a file. */
  #sendPending(): void {
    const gap = this.#options.mergeGap ?? 32 * 1024;
    const maxSize = this.#options.maxMergeSize ?? DEFAULT_MAX_MERGE_SIZE;
    const pending = this.#pending;
    this.#pending = new Map();
    for (const [url, reads] of pending) {
      reads.sort((a, b) => a.offset - b.offset);
      let run: PendingRead[] = [];
      let start = 0;
      let end = 0;
      const send = (group: PendingRead[], from: number, to: number) => {
        // One caller's signal cannot cancel a request that others share
        const signal = group.length === 1 ? group[0]?.signal : undefined;
        this.#readUrl(url, from, to - from, { signal }).then(
          (bytes) => {
            for (const read of group) {
              const at = read.offset - from;
              // A copy, so that a chunk does not keep the whole response in memory
              read.resolve(
                group.length === 1 ? bytes : bytes.slice(at, at + read.length),
              );
            }
          },
          (reason) => {
            for (const read of group) read.reject(reason);
          },
        );
      };
      for (const read of reads) {
        const stop = read.offset + read.length;
        if (
          run.length > 0 &&
          read.offset <= end + gap &&
          Math.max(end, stop) - start <= maxSize
        ) {
          run.push(read);
          end = Math.max(end, stop);
          continue;
        }
        if (run.length > 0) send(run, start, end);
        run = [read];
        start = read.offset;
        end = stop;
      }
      if (run.length > 0) send(run, start, end);
    }
  }

  #checkFile(path: string): Promise<void> {
    let checked = this.#checkedFiles.get(path);
    if (!checked) {
      const expected = this.#sources[path]?.size;
      const fileSize = this.#options.fileSize;
      checked =
        expected === undefined || !fileSize
          ? Promise.resolve()
          : fileSize(path).then((size) => {
              if (size !== expected) {
                throw new SourceChangedError(
                  `${path} has changed since the references were generated (size ${size} bytes, recorded ${expected})`,
                );
              }
            });
      this.#checkedFiles.set(path, checked);
    }
    return checked;
  }

  async #readUrl(
    url: string,
    offset: number | undefined,
    length: number | undefined,
    opts: GetOptions,
  ): Promise<Uint8Array> {
    const retries = this.#options.retries ?? 5;
    const source = this.#sources[url];
    const headers: Record<string, string> = {};
    if (offset !== undefined && length !== undefined)
      headers.Range = `bytes=${offset}-${offset + length - 1}`;
    if (source?.etag) headers["If-Match"] = source.etag;
    for (let attempt = 0; ; attempt++) {
      let problem: unknown;
      try {
        const response = await this.#fetch(await this.#resolveUrl(url), {
          headers,
          signal: opts.signal,
        });
        if (response.status === 412) {
          throw new SourceChangedError(
            `${url} has changed since the references were generated (ETag no longer matches)`,
          );
        }
        if (response.ok) {
          const total = /bytes \d+-\d+\/(\d+)/.exec(
            response.headers.get("Content-Range") ?? "",
          )?.[1];
          if (
            source?.size !== undefined &&
            total !== undefined &&
            Number(total) !== source.size
          ) {
            throw new SourceChangedError(
              `${url} has changed since the references were generated (size ${total} bytes, recorded ${source.size})`,
            );
          }
          const body = new Uint8Array(await response.arrayBuffer());
          // A server that ignores Range answers 200 with the whole file
          const whole =
            response.status === 200 &&
            offset !== undefined &&
            length !== undefined;
          return whole ? body.subarray(offset, offset + length) : body;
        }
        problem = new Error(`HTTP ${response.status} reading ${url}`);
        const transient =
          response.status >= 500 ||
          response.status === 408 ||
          response.status === 429;
        if (!transient) throw problem;
      } catch (error) {
        if (
          error instanceof SourceChangedError ||
          opts.signal?.aborted ||
          error === problem
        )
          throw error;
        problem = error;
      }
      if (attempt >= retries) throw problem;
      await new Promise((resolve) => setTimeout(resolve, 100 * 2 ** attempt));
    }
  }
}
