import pako from "pako";
import { describe, expect, it } from "vitest";
import { qfcDecompress } from "./qfc";

// A qfc chunk is a 5-int32 header followed by zlib-compressed int16
// quantized spectral coefficients, num_samples * num_channels of them per
// segment. All-zero coefficients decode to an all-zero signal, which is
// enough to check the output type and length for each dtype and path.
const buildChunk = (o: {
  numSamples: number;
  numChannels: number;
  segmentLength: number;
}) => {
  const header = new Int32Array([
    7364182,
    1,
    o.numSamples,
    o.numChannels,
    o.segmentLength,
  ]);
  const coefficients = new Int16Array(o.numSamples * o.numChannels);
  const compressed = pako.deflate(new Uint8Array(coefficients.buffer));
  const out = new Uint8Array(header.byteLength + compressed.byteLength);
  out.set(new Uint8Array(header.buffer), 0);
  out.set(compressed, header.byteLength);
  return out.buffer;
};

const compressor = (dtype: "int16" | "float32", segmentLength: number) => ({
  id: "qfc" as const,
  compression_method: "zlib" as const,
  dtype,
  quant_scale_factor: 0.01,
  segment_length: segmentLength,
  zlib_level: 3,
  zstd_level: 3,
});

describe("qfcDecompress", () => {
  it("decodes an unsegmented int16 chunk to one value per sample", async () => {
    const shape = [8, 2];
    const out = await qfcDecompress(
      buildChunk({ numSamples: 8, numChannels: 2, segmentLength: 0 }),
      shape,
      compressor("int16", 0),
    );
    expect(out.byteLength).toBe(8 * 2 * 2);
    expect(Array.from(new Int16Array(out.buffer ?? out))).toEqual(
      new Array(16).fill(0),
    );
  });

  it("decodes a segmented int16 chunk", async () => {
    const out = await qfcDecompress(
      buildChunk({ numSamples: 8, numChannels: 1, segmentLength: 4 }),
      [8, 1],
      compressor("int16", 4),
    );
    expect(out.byteLength).toBe(8 * 2);
  });

  it("decodes a float32 chunk to one value per sample", async () => {
    const out = await qfcDecompress(
      buildChunk({ numSamples: 8, numChannels: 2, segmentLength: 0 }),
      [8, 2],
      compressor("float32", 0),
    );
    expect(out.byteLength).toBe(8 * 2 * 4);
    expect(Array.from(new Float32Array(out.buffer ?? out))).toEqual(
      new Array(16).fill(0),
    );
  });

  it("rejects a chunk whose header disagrees with the shape", async () => {
    await expect(
      qfcDecompress(
        buildChunk({ numSamples: 8, numChannels: 2, segmentLength: 0 }),
        [9, 2],
        compressor("int16", 0),
      ),
    ).rejects.toThrow(/num samples/);
  });
});
