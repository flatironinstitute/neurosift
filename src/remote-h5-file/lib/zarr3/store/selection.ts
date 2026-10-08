/**
 * Which bytes of every record in a file belong to an array.
 *
 * A reference is read as consecutive records of recordSize bytes. From each
 * one, the [start, stop) ranges in keep are taken and joined in the order
 * listed.
 */
export class Selection {
  readonly recordSize: number;
  readonly keep: [number, number][];
  /** How many bytes of a record are kept. */
  readonly kept: number;

  constructor(entry: { record_size: number; keep: number[][] }) {
    this.recordSize = entry.record_size;
    this.keep = entry.keep.map(([a, b]) => [a as number, b as number]);
    const valid =
      Number.isInteger(this.recordSize) &&
      this.recordSize > 0 &&
      this.keep.length > 0 &&
      this.keep.every(
        ([a, b]) =>
          Number.isInteger(a) &&
          Number.isInteger(b) &&
          0 <= a &&
          a < b &&
          b <= this.recordSize,
      );
    if (!valid) {
      throw new Error(
        `Invalid selection: record_size ${entry.record_size}, keep ${JSON.stringify(entry.keep)}`,
      );
    }
    this.kept = this.keep.reduce((total, [a, b]) => total + b - a, 0);
  }

  /** The size of what is kept from sourceSize bytes of the file. */
  selectedSize(sourceSize: number): number {
    if (sourceSize % this.recordSize !== 0) {
      throw new Error(
        `A reference of ${sourceSize} bytes is not a whole number of ${this.recordSize} byte records`,
      );
    }
    return (sourceSize / this.recordSize) * this.kept;
  }

  /** Keep the selected bytes of every record in data. */
  apply(data: Uint8Array): Uint8Array {
    const out = new Uint8Array(this.selectedSize(data.length));
    let written = 0;
    for (let record = 0; record < data.length; record += this.recordSize) {
      for (const [a, b] of this.keep) {
        out.set(data.subarray(record + a, record + b), written);
        written += b - a;
      }
    }
    return out;
  }

  /**
   * Where bytes [start, stop) of the selected data are in the file: the offset
   * and length of the whole records that hold them, and how many selected
   * bytes to skip at the front of what those records give.
   */
  sourceRange(
    start: number,
    stop: number,
  ): { offset: number; length: number; skip: number } {
    const first = Math.floor(start / this.kept);
    const last = Math.ceil(stop / this.kept);
    return {
      offset: first * this.recordSize,
      length: (last - first) * this.recordSize,
      skip: start - first * this.kept,
    };
  }
}
