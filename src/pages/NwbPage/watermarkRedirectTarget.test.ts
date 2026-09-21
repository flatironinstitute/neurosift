import { afterEach, describe, expect, it, vi } from "vitest";

// The module graph reaches the worker-backed HDF5 reader, which creates a
// worker at import time, so stub that out for node.
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
vi.mock("./hdf5Cache", () => ({
  getCachedObject: async () => undefined,
  setCachedObject: async () => {},
}));
vi.mock("@components/StatusBarContext", () => ({
  setStatusItem: () => {},
  removeStatusItem: () => {},
}));

const { watermarkRedirectTarget } = await import("./hdf5Interface");

const downloadUrl =
  "https://api.dandiarchive.org/api/assets/0123-4567/download/";
const blob = "https://dandiarchive.s3.amazonaws.com/blobs/012/345/0123-4567";
const presigned =
  blob +
  "?response-content-disposition=attachment%3B%20filename%3D%22a.nwb%22" +
  "&X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIA%2Fus-east-2%2Fs3%2Faws4_request" +
  "&X-Amz-Date=20250101T000000Z&X-Amz-Expires=3600&X-Amz-SignedHeaders=host&X-Amz-Signature=abc";
const bareWatermarked = `${blob}?neurosift=1`;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("watermarkRedirectTarget", () => {
  it("uses the bare watermarked blob url when it can be read anonymously", async () => {
    const calls: string[] = [];
    vi.stubGlobal("fetch", async (url: string) => {
      calls.push(url);
      return { ok: true, status: 200, url };
    });
    expect(await watermarkRedirectTarget(downloadUrl, presigned)).toBe(
      bareWatermarked,
    );
    expect(calls).toEqual([bareWatermarked]);
  });

  it("keeps the presigned url when the bare url is not readable", async () => {
    // A distinct blob, since successful probes are cached per bare url.
    const other = presigned.replace("0123-4567", "8901-2345");
    vi.stubGlobal("fetch", async (url: string) => ({
      ok: false,
      status: 403,
      url,
    }));
    expect(await watermarkRedirectTarget(downloadUrl, other)).toBe(other);
  });

  it("keeps the presigned url when the probe throws", async () => {
    const other = presigned.replace("0123-4567", "6789-0123");
    vi.stubGlobal("fetch", async () => {
      throw new TypeError("Failed to fetch");
    });
    expect(await watermarkRedirectTarget(downloadUrl, other)).toBe(other);
  });

  it("probes each blob only once", async () => {
    let n = 0;
    vi.stubGlobal("fetch", async (url: string) => {
      n++;
      return { ok: true, status: 200, url };
    });
    // The first test above already probed this blob successfully.
    expect(await watermarkRedirectTarget(downloadUrl, presigned)).toBe(
      bareWatermarked,
    );
    expect(n).toBe(0);
  });

  it("watermarks a non-presigned redirect target without probing", async () => {
    vi.stubGlobal("fetch", async () => {
      throw new Error("should not be called");
    });
    const target = "https://example-bucket.s3.amazonaws.com/x/y.nwb";
    expect(await watermarkRedirectTarget(downloadUrl, target)).toBe(
      `${target}?neurosift=1`,
    );
  });

  it("returns the url unchanged when no redirect happened", async () => {
    vi.stubGlobal("fetch", async () => {
      throw new Error("should not be called");
    });
    expect(await watermarkRedirectTarget(downloadUrl, downloadUrl)).toBe(
      downloadUrl,
    );
  });
});
