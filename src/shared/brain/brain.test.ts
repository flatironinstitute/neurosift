// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  assetIdFromUrl,
  BRAIN_URL,
  brainAtlases,
  brainHref,
  resetBrainAtlases,
  useBrainLink,
} from "./brain";

const INDEX = {
  atlases: [
    { key: "allen_ccf", dandisets: ["000017", "000022"] },
    { key: "nmt", dandisets: ["000070", "000017"] },
  ],
};

const serve = (body: unknown, ok = true) =>
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok, json: async () => body })),
  );

afterEach(() => {
  vi.unstubAllGlobals();
  resetBrainAtlases();
});

describe("Brain links", () => {
  it("knows which atlas holds each dandiset, the first listed winning", async () => {
    serve(INDEX);
    const map = await brainAtlases();
    expect(map.get("000070")).toBe("nmt");
    expect(map.get("000017")).toBe("allen_ccf");
    expect(fetch).toHaveBeenCalledWith(`${BRAIN_URL}data/atlases_index.json`);
  });

  it("links a dandiset, or one of its files, in Brain's own link format", () => {
    expect(brainHref("allen_ccf", "000022")).toBe(
      `${BRAIN_URL}?atlas=allen_ccf#dandiset=000022`,
    );
    expect(brainHref("allen_ccf", "000022", "abc")).toBe(
      `${BRAIN_URL}?atlas=allen_ccf#dandiset=000022&session=abc`,
    );
  });

  it("reads the asset id from a DANDI download address", () => {
    expect(
      assetIdFromUrl(
        "https://api.dandiarchive.org/api/assets/ac4bfefc-d259-4d13-a083-89df1f9044b9/download/",
      ),
    ).toBe("ac4bfefc-d259-4d13-a083-89df1f9044b9");
    expect(assetIdFromUrl("https://example.org/file.nwb")).toBeUndefined();
  });

  it("offers a link only for dandisets Brain can place", async () => {
    serve(INDEX);
    const { result, rerender } = renderHook(
      ({ id }: { id: string }) => useBrainLink(id),
      { initialProps: { id: "000022" } },
    );
    await waitFor(() =>
      expect(result.current).toBe(
        `${BRAIN_URL}?atlas=allen_ccf#dandiset=000022`,
      ),
    );
    rerender({ id: "000999" });
    await waitFor(() => expect(result.current).toBeUndefined());
  });

  it("offers no link when Brain can't be reached", async () => {
    serve(null, false);
    const { result } = renderHook(() => useBrainLink("000022"));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(result.current).toBeUndefined();
  });
});
