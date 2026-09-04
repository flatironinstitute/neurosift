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

const { tryGetLindiUrl } = await import("./hdf5Interface");

const assetUrl = "https://api.dandiarchive.org/api/assets/0123-4567/download/";
const expectedLindiUrl =
  "https://lindi.neurosift.org/dandi/dandisets/000001/assets/0123-4567/nwb.lindi.json";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("tryGetLindiUrl", () => {
  it("returns the LINDI url when the index answers ok", async () => {
    const calls: [string, RequestInit | undefined][] = [];
    vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
      calls.push([url, init]);
      return { ok: true };
    });
    expect(await tryGetLindiUrl(assetUrl, "000001")).toBe(expectedLindiUrl);
    expect(calls).toEqual([[expectedLindiUrl, { method: "HEAD" }]]);
  });

  it("returns undefined when the index has no file", async () => {
    vi.stubGlobal("fetch", async () => ({ ok: false, status: 404 }));
    expect(await tryGetLindiUrl(assetUrl, "000001")).toBeUndefined();
  });

  it("returns undefined instead of throwing when the index is unreachable", async () => {
    vi.stubGlobal("fetch", async () => {
      throw new TypeError("Failed to fetch");
    });
    await expect(tryGetLindiUrl(assetUrl, "000001")).resolves.toBeUndefined();
  });

  it("passes a lindi url through and ignores non-DANDI urls", async () => {
    vi.stubGlobal("fetch", async () => {
      throw new Error("should not be called");
    });
    expect(await tryGetLindiUrl("https://x/y.lindi.json", "000001")).toBe(
      "https://x/y.lindi.json",
    );
    expect(
      await tryGetLindiUrl("https://example.org/file.nwb", "000001"),
    ).toBeUndefined();
  });
});
