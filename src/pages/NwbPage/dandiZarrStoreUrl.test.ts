import { afterEach, describe, expect, it, vi } from "vitest";
import { getDandiZarrStoreUrl, isNwbAssetPath } from "./dandiZarrStoreUrl";

const assetId = "c2f8292e-3d71-4748-b754-8370355d09bf";
const zarrId = "bc618439-b009-47d1-a5a4-829b31dc001e";
const downloadUrl = `https://api.dandiarchive.org/api/assets/${assetId}/download/`;
const storeUrl = `https://dandiarchive.s3.amazonaws.com/zarr/${zarrId}/`;

const respondWith = (info: unknown, status = 200) =>
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify(info), { status })),
  );

afterEach(() => vi.unstubAllGlobals());

describe("isNwbAssetPath", () => {
  it("accepts NWB files stored as HDF5 and as Zarr", () => {
    expect(isNwbAssetPath("sub-1/sub-1_ecephys.nwb")).toBe(true);
    expect(isNwbAssetPath("sub-1/sub-1_ophys.nwb.zarr")).toBe(true);
    expect(isNwbAssetPath("sub-1/sub-1_ophys.ome.zarr")).toBe(false);
    expect(isNwbAssetPath("sub-1/sub-1_ecephys.nwb.lindi.json")).toBe(false);
  });
});

describe("getDandiZarrStoreUrl", () => {
  it("finds the store of a Zarr asset in the asset's metadata", async () => {
    respondWith({
      asset_id: assetId,
      blob: null,
      zarr: zarrId,
      metadata: { contentUrl: [downloadUrl, storeUrl] },
    });
    expect(await getDandiZarrStoreUrl(downloadUrl)).toBe(storeUrl);
    expect(vi.mocked(fetch).mock.calls[0][0]).toBe(
      `https://api.dandiarchive.org/api/assets/${assetId}/info/`,
    );
  });

  it("passes the authorization header, for an embargoed asset", async () => {
    respondWith({ zarr: zarrId, metadata: { contentUrl: [storeUrl] } });
    const headers = { Authorization: "token abc" };
    await getDandiZarrStoreUrl(downloadUrl, headers);
    expect(vi.mocked(fetch).mock.calls[0][1]).toEqual({ headers });
  });

  it("is undefined for an HDF5 asset", async () => {
    respondWith({
      blob: "4da1deef-ffb3-4a56-bd65-2f55479ca44f",
      zarr: null,
      metadata: {
        contentUrl: [
          downloadUrl,
          "https://dandiarchive.s3.amazonaws.com/blobs/4da/1de/4da1deef-ffb3-4a56-bd65-2f55479ca44f",
        ],
      },
    });
    expect(await getDandiZarrStoreUrl(downloadUrl)).toBeUndefined();
  });

  it("is undefined when the metadata cannot be read", async () => {
    respondWith({ detail: "Not found." }, 404);
    expect(await getDandiZarrStoreUrl(downloadUrl)).toBeUndefined();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
    );
    expect(await getDandiZarrStoreUrl(downloadUrl)).toBeUndefined();
  });

  it("does not ask about a url that is not a DANDI asset download", async () => {
    respondWith({});
    expect(await getDandiZarrStoreUrl(storeUrl)).toBeUndefined();
    expect(
      await getDandiZarrStoreUrl("https://example.org/file.nwb"),
    ).toBeUndefined();
    expect(fetch).not.toHaveBeenCalled();
  });
});
