import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Fake dataset metadata returned by getDataset() for any path, sized so it
// always passes the "too large to load" guard in getHdf5DatasetData.
const FAKE_DATASET = { shape: [10], dtype: "float64", attrs: {} };

const lindiGetDatasetData = vi.fn();
const lindiCreate = vi.fn();
const directGetDatasetData = vi.fn();
const directConstructor = vi.fn();

vi.mock("@remote-h5-file", () => {
  class RemoteH5File {
    constructor(url: string, opts: unknown) {
      directConstructor(url, opts);
    }
    async getDataset() {
      return FAKE_DATASET;
    }
    async getDatasetData(path: string, o: unknown) {
      return directGetDatasetData(path, o);
    }
  }
  class RemoteH5FileLindi {
    static async create(url: string) {
      lindiCreate(url);
      return new RemoteH5FileLindi();
    }
    async getDataset() {
      return FAKE_DATASET;
    }
    async getDatasetData(path: string, o: unknown) {
      return lindiGetDatasetData(path, o);
    }
  }
  return { RemoteH5File, RemoteH5FileLindi };
});

vi.mock("../util/getAuthorizationHeaderForUrl", () => ({
  default: () => "",
}));

describe("getHdf5DatasetData - LINDI external-array-link fallback", () => {
  const DANDI_ASSET_URL =
    "https://api.dandiarchive.org/api/assets/00000000-0000-0000-0000-000000000000/download/";
  const DIRECT_BLOB_URL = "https://dandiarchive.s3.amazonaws.com/blobs/abc123";
  const LINDI_URL =
    "https://lindi.neurosift.org/dandi/dandisets/000003/assets/00000000-0000-0000-0000-000000000000/nwb.lindi.json";
  const PATH = "/processing/ecephys/LFP/ElectricalSeries/data";

  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    lindiGetDatasetData.mockReset();
    lindiCreate.mockReset();
    directGetDatasetData.mockReset();
    directConstructor.mockReset();

    // Any HEAD-style lookup (the LINDI-existence check, or the redirect-to-blob
    // check) resolves through this fetch stub.
    fetchMock = vi.fn(async (url: string) => {
      if (url === LINDI_URL) {
        return { ok: true, status: 200, url: LINDI_URL };
      }
      if (url === DANDI_ASSET_URL) {
        return { ok: true, status: 200, url: DIRECT_BLOB_URL };
      }
      return { ok: false, status: 404, url };
    });
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("falls back to a direct blob read when the LINDI sidecar can't serve an external array link", async () => {
    const { getHdf5DatasetData, setCurrentDandisetId } =
      await import("./hdf5Interface");
    setCurrentDandisetId("000003");

    lindiGetDatasetData.mockRejectedValue(
      new Error("External array link not supported on server side"),
    );
    directGetDatasetData.mockResolvedValue(new Float64Array([1, 2, 3]));

    const result = await getHdf5DatasetData(DANDI_ASSET_URL, PATH, {});

    // Resolved via the LINDI sidecar first...
    expect(lindiCreate).toHaveBeenCalledWith(LINDI_URL);
    expect(lindiGetDatasetData).toHaveBeenCalledWith(PATH, {});
    // ...and on failure, fell back to a direct read from the underlying blob.
    expect(directConstructor).toHaveBeenCalledWith(DIRECT_BLOB_URL, {});
    expect(directGetDatasetData).toHaveBeenCalledWith(PATH, {});
    expect(result).toEqual(new Float64Array([1, 2, 3]));
  });

  it("does not fall back (and rethrows) when the caller directly requested the LINDI file", async () => {
    const { getHdf5DatasetData, setCurrentDandisetId } =
      await import("./hdf5Interface");
    setCurrentDandisetId("000003");

    const error = new Error("External array link not supported on server side");
    lindiGetDatasetData.mockRejectedValue(error);

    await expect(getHdf5DatasetData(LINDI_URL, PATH, {})).rejects.toThrow(
      error.message,
    );

    expect(directConstructor).not.toHaveBeenCalled();
    expect(directGetDatasetData).not.toHaveBeenCalled();
  });
});
