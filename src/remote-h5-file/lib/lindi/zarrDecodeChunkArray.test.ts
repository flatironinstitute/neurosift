import { describe, expect, it } from "vitest";
import zarrDecodeChunkArray, { unshuffle } from "./zarrDecodeChunkArray";

// Fixtures produced with numcodecs.Shuffle, which is the codec lindi emits for
// HDF5 datasets written with shuffle=True (h5_filters_to_codecs). The
// "shuffledZlib" variants add zlib on top, which is how a shuffle + gzip
// dataset appears in a LINDI file: filters [shuffle, zlib], compressor null.
const fixtures: {
  [name: string]: {
    dtype: string;
    elementsize: number;
    values: number[];
    shuffled: string;
    shuffledZlib: string;
  };
} = {
  int16: {
    dtype: "<i2",
    elementsize: 2,
    values: [-3, 0, 1, 300, -32768, 32767, 7, 8],
    shuffled: "/QABLAD/Bwj/AAABgH8AAA==",
    shuffledZlib: "eJz7y8Cow/CfneM/AwNjQz0DAwApJwQ4",
  },
  int32: {
    dtype: "<i4",
    elementsize: 4,
    values: [
      -5000015, -4000012, -3000009, -2000006, -1000003, 0, 1000003, 2000006,
      3000009, 4000012, 5000015, 6000018, 7000021, 8000024, 9000027, 10000030,
      11000033, 12000036, 13000039, 14000042, 15000045, 16000048, 17000051,
      18000054, 19000057,
    ],
    shuffled:
      "sfQ3er0AQ4bJDE+S1RhbnuEkZ6rtMHO2+bT2OXu9AEKExglLjc8SVJbYG12f4SRmqOqzwtLh8AAPHi09TFtqeomYp7fG1eT0AxIh//////8AAAAAAAAAAAAAAAAAAAAAAAEBAQ==",
    shuffledZlib:
      "eJzb+MW8ai+Dc9tJHv9JVyWi5z1USV/11qB4288t3yyr9zI4tRzj9O49LxQy7YZ07PyHKmkrXm0+dOnhBwZ+OV1bn+isqs4Zy7cfu/rkC7OQ4n8QYEAHjIyMAK7ZKm0=",
  },
  float32: {
    dtype: "<f4",
    elementsize: 4,
    values: [-1.5, -1.0, -0.5, 0.0, 0.5, 1.0, 1.5, 2.0, 2.5],
    shuffled: "AAAAAAAAAAAAAAAAAAAAAAAAwIAAAACAwAAgv7+/AD8/P0BA",
    shuffledZlib: "eJxjYEAHBxqARMMBBoX9+/cz2NvbOzgAADyABhs=",
  },
  float64: {
    dtype: "<f8",
    elementsize: 8,
    values: [0.1, -2.25, 10000000000.0, 3.14159, -0.0, 42.0, 7.5],
    shuffled:
      "mgAAbgAAAJkAAIYAAACZAAAbAAAAmQAg8AAAAJkAX/kAAACZAKAhAAAAuQICCQBFHj/AQkCAQEA=",
    shuffledZlib:
      "eJybxcCQx8DAMJOBoQ1CSYMphQ9gKv4nmFqgCKR2MjFxMrjK2R9wcmhwcAAAKKELeg==",
  },
  uint16: {
    dtype: "<u2",
    elementsize: 2,
    values: [0, 1, 255, 256, 65535, 4096, 4097],
    shuffled: "AAH/AP8AAQAAAAH/EBA=",
    shuffledZlib: "eJxjYPzP8J+BkYGBgfG/gAAAGT4DIQ==",
  },
};

const fromBase64 = (s: string): ArrayBuffer => {
  const bytes = Buffer.from(s, "base64");
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  );
};

describe("unshuffle", () => {
  it("restores element order for a small hand-built block", () => {
    // Four 2-byte elements [1,2] [3,4] [5,6] [7,8], shuffled by byte plane:
    // all first bytes, then all second bytes.
    const shuffled = new Uint8Array([1, 3, 5, 7, 2, 4, 6, 8]);
    const out = new Uint8Array(unshuffle(shuffled.buffer, 2));
    expect(Array.from(out)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("is the identity for elementsize 1", () => {
    const src = new Uint8Array([9, 8, 7, 6, 5]);
    const out = new Uint8Array(unshuffle(src.buffer, 1));
    expect(Array.from(out)).toEqual([9, 8, 7, 6, 5]);
  });

  it("leaves trailing bytes that do not fill an element in place", () => {
    // Two 4-byte elements followed by three leftover bytes, as the HDF5
    // shuffle filter writes them.
    const shuffled = new Uint8Array([1, 5, 2, 6, 3, 7, 4, 8, 100, 101, 102]);
    const out = new Uint8Array(unshuffle(shuffled.buffer, 4));
    expect(Array.from(out)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 100, 101, 102]);
  });

  it("does not modify its input", () => {
    const shuffled = new Uint8Array([1, 3, 5, 7, 2, 4, 6, 8]);
    unshuffle(shuffled.buffer, 2);
    expect(Array.from(shuffled)).toEqual([1, 3, 5, 7, 2, 4, 6, 8]);
  });

  it("rejects a non-positive elementsize", () => {
    expect(() => unshuffle(new ArrayBuffer(4), 0)).toThrow();
  });
});

describe("zarrDecodeChunkArray with the shuffle filter", () => {
  for (const [name, f] of Object.entries(fixtures)) {
    it(`decodes a shuffled ${name} chunk`, async () => {
      const out = await zarrDecodeChunkArray(
        fromBase64(f.shuffled),
        f.dtype,
        undefined,
        [{ id: "shuffle", elementsize: f.elementsize }],
        [f.values.length],
      );
      expect(Array.from(out as ArrayLike<number>)).toEqual(f.values);
    });

    it(`decodes a shuffled and zlib compressed ${name} chunk`, async () => {
      const out = await zarrDecodeChunkArray(
        fromBase64(f.shuffledZlib),
        f.dtype,
        null,
        [
          { id: "shuffle", elementsize: f.elementsize },
          { id: "zlib", level: 4 },
        ],
        [f.values.length],
      );
      expect(Array.from(out as ArrayLike<number>)).toEqual(f.values);
    });
  }
});
