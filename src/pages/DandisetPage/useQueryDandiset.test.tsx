// @vitest-environment jsdom
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useDandisetResult } from "./useQueryDandiset";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const respond = (status: number, body: unknown = {}) =>
  vi.stubGlobal(
    "fetch",
    vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify(body), { status })),
    ),
  );

describe("useDandisetResult", () => {
  it("is loading until DANDI answers, then has the Dandiset", async () => {
    respond(200, { identifier: "000006" });
    const { result } = renderHook(() =>
      useDandisetResult("000006", false, false),
    );
    expect(result.current).toEqual({ dandiset: undefined, failure: undefined });
    await waitFor(() =>
      expect(result.current.dandiset?.identifier).toBe("000006"),
    );
    expect(fetch).toHaveBeenCalledWith(
      "https://api.dandiarchive.org/api/dandisets/000006",
      expect.anything(),
    );
  });

  it("reports a Dandiset DANDI doesn't have", async () => {
    respond(404);
    const { result } = renderHook(() =>
      useDandisetResult("999999", false, false),
    );
    await waitFor(() =>
      expect(result.current.failure).toEqual({
        status: 404,
        url: "https://api.dandiarchive.org/api/dandisets/999999",
        message: "DANDI has no Dandiset 999999 (404).",
        access: "notPublic",
      }),
    );
  });

  it("reports an embargoed Dandiset by its status", async () => {
    respond(403);
    const { result } = renderHook(() =>
      useDandisetResult("000123", false, false),
    );
    await waitFor(() => expect(result.current.failure?.status).toBe(403));
  });

  it("opens a public Dandiset without a key DANDI refused, and says so", async () => {
    localStorage.setItem("dandiApiKey", "refused-in-hook-test");
    const fetchMock = vi.fn((_url: string, init?: RequestInit) =>
      Promise.resolve(
        init?.headers
          ? new Response("{}", { status: 401 })
          : new Response(JSON.stringify({ identifier: "000673" })),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() =>
      useDandisetResult("000673", false, false),
    );
    await waitFor(() =>
      expect(result.current.dandiset?.identifier).toBe("000673"),
    );
    expect(result.current.keyRefusedUrl).toBe(
      "https://api.dandiarchive.org/api/dandisets/000673",
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
    localStorage.clear();
  });

  it("reports a refused key on an embargoed Dandiset with the key's 401", async () => {
    localStorage.setItem("dandiApiKey", "refused-embargoed-test");
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, init?: RequestInit) =>
        Promise.resolve(
          new Response("{}", { status: init?.headers ? 401 : 404 }),
        ),
      ),
    );
    const { result } = renderHook(() =>
      useDandisetResult("001675", false, false),
    );
    await waitFor(() =>
      expect(result.current.failure).toMatchObject({
        status: 401,
        access: "keyRefused",
        message: "DANDI answered 401 for Dandiset 001675.",
      }),
    );
    localStorage.clear();
  });

  it("reports a request that never reached DANDI", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new TypeError("Failed to fetch"))),
    );
    const { result } = renderHook(() =>
      useDandisetResult("000006", false, false),
    );
    await waitFor(() =>
      expect(result.current.failure?.message).toBe("Failed to fetch"),
    );
    expect(result.current.failure?.status).toBeUndefined();
  });

  it("asks EMBER for EMBER Dandisets", async () => {
    respond(200, { identifier: "000598" });
    renderHook(() => useDandisetResult("000598", false, true));
    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        "https://api-dandi.emberarchive.org/api/dandisets/000598",
        expect.anything(),
      ),
    );
  });
});
