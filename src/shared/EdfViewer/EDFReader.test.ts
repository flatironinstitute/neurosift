import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import EDFReader from "./EDFReader";

// Build a small EDF file in memory: 16-bit samples, `nRecords` records of
// one second, each channel with its own samples per record. Sample values
// encode (channel, index) so that reads can be checked exactly.
const pad = (s: string, n: number) => (s + " ".repeat(n)).slice(0, n);

const buildEdf = (o: { nRecords: number; nSamps: number[] }) => {
  const nchan = o.nSamps.length;
  const headerBytes = 256 + 256 * nchan;
  let header = "";
  header += pad("0", 8);
  header += pad("subject", 80);
  header += pad("recording", 80);
  header += pad("01.02.03", 8);
  header += pad("04.05.06", 8);
  header += pad(String(headerBytes), 8);
  header += pad("", 44);
  header += pad(String(o.nRecords), 8);
  header += pad("1", 8);
  header += pad(String(nchan), 4);
  const per = (f: (ch: number) => string, n: number) => {
    for (let ch = 0; ch < nchan; ch++) header += pad(f(ch), n);
  };
  per((ch) => `ch${ch}`, 16);
  per(() => "", 80);
  per(() => "uV", 8);
  // physical range -1000..1000 over digital -32768..32767, so that
  // calibration is applied but stays easy to reason about
  per(() => "-1000", 8);
  per(() => "1000", 8);
  per(() => "-32768", 8);
  per(() => "32767", 8);
  per(() => "", 80);
  per((ch) => String(o.nSamps[ch]), 8);
  per(() => "", 32);
  if (header.length !== headerBytes) {
    throw new Error(
      `header is ${header.length} bytes, expected ${headerBytes}`,
    );
  }
  const recordSamples = o.nSamps.reduce((a, b) => a + b, 0);
  const buf = new ArrayBuffer(headerBytes + o.nRecords * recordSamples * 2);
  new Uint8Array(buf).set(new TextEncoder().encode(header), 0);
  const view = new DataView(buf);
  let p = headerBytes;
  for (let r = 0; r < o.nRecords; r++) {
    for (let ch = 0; ch < nchan; ch++) {
      for (let i = 0; i < o.nSamps[ch]; i++) {
        const index = r * o.nSamps[ch] + i;
        view.setInt16(p, digitalValue(ch, index), true);
        p += 2;
      }
    }
  }
  return buf;
};

// A distinct, small digital value per (channel, index).
const digitalValue = (ch: number, index: number) => ch * 1000 + index;
const physicalValue = (ch: number, index: number) => {
  const cal = 2000 / 65535;
  const off = -1000 - cal * -32768;
  return digitalValue(ch, index) * cal + off;
};

// The reader calibrates in single precision, so compare loosely.
const expectSamples = (x: Float32Array, expected: number[]) => {
  expect(x.length).toBe(expected.length);
  for (let i = 0; i < expected.length; i++) {
    expect(x[i]).toBeCloseTo(expected[i], 3);
  }
};

// Serve the in-memory file over fetch with Range support; record what
// was asked for so the tests can check that reads stay inside the file.
const serve = (file: ArrayBuffer) => {
  const ranges: [number, number][] = [];
  vi.stubGlobal(
    "fetch",
    async (_url: string, init?: { headers?: { Range?: string } }) => {
      const m = /^bytes=(\d+)-(\d+)$/.exec(init?.headers?.Range ?? "");
      if (!m) throw new Error("expected a Range header");
      const start = parseInt(m[1]);
      const end = parseInt(m[2]);
      ranges.push([start, end]);
      if (start >= file.byteLength) {
        return { ok: false, statusText: "Range Not Satisfiable" };
      }
      const body = file.slice(start, Math.min(end + 1, file.byteLength));
      return {
        ok: true,
        statusText: "Partial Content",
        arrayBuffer: async () => body,
      };
    },
  );
  return ranges;
};

describe("EDFReader.readSamples", () => {
  const nRecords = 3;
  const nSamps = [10, 10, 5];
  let ranges: [number, number][];
  beforeEach(() => {
    ranges = serve(buildEdf({ nRecords, nSamps }));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("parses the header", async () => {
    const r = await EDFReader.fromURL("http://x/f.edf");
    expect(r.getNSignals()).toBe(3);
    expect(Array.from(r.getNSamples())).toEqual([30, 30, 15]);
    expect(Array.from(r.getSignalFreqs())).toEqual([10, 10, 5]);
    expect(r.getSignalTextLabels()).toEqual(["ch0", "ch1", "ch2"]);
  });

  it("reads a half-open sample range across records with calibration applied", async () => {
    const r = await EDFReader.fromURL("http://x/f.edf");
    const x = await r.readSamples(1, 8, 13);
    expect(Array.from(x)).toEqual(
      [8, 9, 10, 11, 12].map((i) => physicalValue(1, i)),
    );
  });

  it("reads through the end of the recording without touching a record past the end", async () => {
    const r = await EDFReader.fromURL("http://x/f.edf");
    const x = await r.readSamples(0, 25, 30);
    expectSamples(
      x,
      [25, 26, 27, 28, 29].map((i) => physicalValue(0, i)),
    );
    const fileLength = 256 + 256 * 3 + nRecords * 25 * 2;
    for (const [start] of ranges) {
      expect(start).toBeLessThan(fileLength);
    }
  });

  it("clamps a range that runs past the end", async () => {
    const r = await EDFReader.fromURL("http://x/f.edf");
    const x = await r.readSamples(2, 12, 100);
    expectSamples(
      x,
      [12, 13, 14].map((i) => physicalValue(2, i)),
    );
    expect((await r.readSamples(2, 15, 20)).length).toBe(0);
  });

  it("reads exactly one record for a range that ends on a record boundary", async () => {
    const r = await EDFReader.fromURL("http://x/f.edf");
    const readBlock = vi.spyOn(r, "readBlockForChannel");
    const x = await r.readSamples(0, 0, 10);
    expect(x.length).toBe(10);
    expect(readBlock).toHaveBeenCalledTimes(1);
  });

  it("reads a whole signal", async () => {
    const r = await EDFReader.fromURL("http://x/f.edf");
    const x = await r.readSignal(2);
    expect(x.length).toBe(15);
    expect(x[14]).toBeCloseTo(physicalValue(2, 14), 3);
  });

  it("serves concurrent reads of different channels without stalling", async () => {
    const r = await EDFReader.fromURL("http://x/f.edf");
    const results = await Promise.race([
      Promise.all([
        r.readSamples(0, 0, 30),
        r.readSamples(1, 0, 30),
        r.readSamples(2, 0, 15),
        r.readSamples(0, 20, 30),
      ]),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("concurrent reads stalled")), 5000),
      ),
    ]);
    expect(results.map((x) => x.length)).toEqual([30, 30, 15, 10]);
  });
});
