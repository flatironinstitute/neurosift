import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchAllPages } from "./fetchAllPages";

const pages: { [url: string]: { results: number[]; next: string | null } } = {
  "https://api.example/paths/?page=1": {
    results: [1, 2, 3],
    next: "https://api.example/paths/?page=2",
  },
  "https://api.example/paths/?page=2": {
    results: [4, 5],
    next: "https://api.example/paths/?page=3",
  },
  "https://api.example/paths/?page=3": { results: [6], next: null },
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchAllPages", () => {
  it("follows next links and concatenates the results in order", async () => {
    const requested: string[] = [];
    const seenHeaders: unknown[] = [];
    vi.stubGlobal("fetch", async (url: string, init: { headers?: unknown }) => {
      requested.push(url);
      seenHeaders.push(init.headers);
      const page = pages[url];
      return { ok: true, status: 200, json: async () => page };
    });
    const out = await fetchAllPages<number>(
      "https://api.example/paths/?page=1",
      { Authorization: "token x" },
    );
    expect(out).toEqual([1, 2, 3, 4, 5, 6]);
    expect(requested).toEqual(Object.keys(pages));
    expect(
      seenHeaders.every(
        (h) => (h as { Authorization: string }).Authorization === "token x",
      ),
    ).toBe(true);
  });

  it("returns a single page when there is no next link", async () => {
    vi.stubGlobal("fetch", async () => ({
      ok: true,
      status: 200,
      json: async () => ({ results: ["a"], next: undefined }),
    }));
    expect(await fetchAllPages<string>("https://api.example/one")).toEqual([
      "a",
    ]);
  });

  it("throws when a page request fails", async () => {
    vi.stubGlobal("fetch", async () => ({ ok: false, status: 403 }));
    await expect(fetchAllPages("https://api.example/x")).rejects.toThrow(/403/);
  });
});
