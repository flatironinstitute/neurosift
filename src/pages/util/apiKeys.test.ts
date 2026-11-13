// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  apiKeyAccess,
  archiveForUrl,
  getAuthorizationHeaderForUrl,
  keyRefusedFor,
  sendWithApiKey,
} from "./apiKeys";

const DANDI = "https://api.dandiarchive.org/api/dandisets/000673/";
const SANDBOX = "https://api.sandbox.dandiarchive.org/api/assets/a/download/";
const EMBER = "https://api-dandi.emberarchive.org/api/dandisets/000200/";

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe("archiveForUrl", () => {
  it("names each archive and where its key is kept", () => {
    expect(archiveForUrl(DANDI)?.name).toBe("DANDI");
    expect(archiveForUrl(SANDBOX)?.name).toBe("DANDI sandbox");
    expect(archiveForUrl(SANDBOX)?.storageKey).toBe("dandiStagingApiKey");
    expect(archiveForUrl(EMBER)?.name).toBe("EMBER");
    expect(archiveForUrl(EMBER)?.storageKey).toBe("emberApiKey");
    expect(archiveForUrl("https://example.org/file.nwb")).toBeUndefined();
  });
});

describe("apiKeyAccess", () => {
  const dandi = archiveForUrl(DANDI)!;
  const ember = archiveForUrl(EMBER)!;

  it("opens what the archive gives", () => {
    expect(apiKeyAccess({ archive: dandi, keySaved: false, status: 200 })).toBe(
      "open",
    );
    expect(apiKeyAccess({ archive: dandi, keySaved: true, status: 200 })).toBe(
      "open",
    );
  });

  it("calls a 401 or 403 without a key embargoed", () => {
    for (const status of [401, 403])
      expect(apiKeyAccess({ archive: ember, keySaved: false, status })).toBe(
        "embargoed",
      );
  });

  it("says a 404 without a key on DANDI may be embargoed, but not on EMBER", () => {
    expect(apiKeyAccess({ archive: dandi, keySaved: false, status: 404 })).toBe(
      "notPublic",
    );
    expect(apiKeyAccess({ archive: ember, keySaved: false, status: 404 })).toBe(
      "failed",
    );
  });

  it("opens public data when a refused key's retry works", () => {
    expect(
      apiKeyAccess({
        archive: dandi,
        keySaved: true,
        status: 401,
        retryStatus: 200,
      }),
    ).toBe("keyRefusedOpen");
  });

  it("blocks when a refused key's retry fails too", () => {
    for (const retryStatus of [401, 404, undefined])
      expect(
        apiKeyAccess({
          archive: dandi,
          keySaved: true,
          status: 401,
          retryStatus,
        }),
      ).toBe("keyRefused");
  });

  it("leaves other failures to the usual error", () => {
    expect(apiKeyAccess({ archive: dandi, keySaved: false, status: 500 })).toBe(
      "failed",
    );
    expect(apiKeyAccess({ archive: dandi, keySaved: true, status: 403 })).toBe(
      "failed",
    );
  });
});

const answer = (...statuses: number[]) => {
  const send = vi.fn((headers?: { Authorization: string }) => {
    void headers;
    return Promise.resolve(new Response(null, { status: statuses.shift() }));
  });
  return send;
};

describe("sendWithApiKey", () => {
  it("sends the saved key and stops when the archive accepts it", async () => {
    localStorage.setItem("dandiApiKey", "good");
    const send = answer(200);
    const result = await sendWithApiKey(DANDI, send);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith({ Authorization: "token good" });
    expect(result.access).toBe("open");
    expect(keyRefusedFor(DANDI)).toBe(false);
  });

  it("sends nothing extra without a key", async () => {
    const send = answer(401);
    const result = await sendWithApiKey(EMBER, send);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith(undefined);
    expect(result).toMatchObject({ access: "embargoed", status: 401 });
  });

  it("retries without a refused key and opens public data", async () => {
    localStorage.setItem("dandiApiKey", "stale-1");
    const send = answer(401, 200);
    const result = await sendWithApiKey(DANDI, send);
    expect(send).toHaveBeenNthCalledWith(2, undefined);
    expect(result.response.status).toBe(200);
    expect(result).toMatchObject({ access: "keyRefusedOpen", status: 401 });
    expect(keyRefusedFor(DANDI)).toBe(true);
    expect(getAuthorizationHeaderForUrl(DANDI)).toBe("");
  });

  it("stays blocked when the retry fails, and reports the key's 401", async () => {
    localStorage.setItem("emberApiKey", "stale-2");
    const result = await sendWithApiKey(EMBER, answer(401, 401));
    expect(result).toMatchObject({ access: "keyRefused", status: 401 });
  });

  it("skips a key already refused on this page, still naming it refused", async () => {
    localStorage.setItem("dandiStagingApiKey", "stale-3");
    await sendWithApiKey(SANDBOX, answer(401, 401));
    const send = answer(200);
    const result = await sendWithApiKey(SANDBOX, send);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith(undefined);
    expect(result.access).toBe("keyRefusedOpen");
  });

  it("uses a new key once it is saved", async () => {
    localStorage.setItem("dandiApiKey", "stale-4");
    await sendWithApiKey(DANDI, answer(401, 200));
    localStorage.setItem("dandiApiKey", "fresh-4");
    expect(getAuthorizationHeaderForUrl(DANDI)).toBe("token fresh-4");
    expect(keyRefusedFor(DANDI)).toBe(false);
  });

  it("leaves urls outside the archives alone", async () => {
    const send = answer(404);
    const result = await sendWithApiKey("https://example.org/f.nwb", send);
    expect(send).toHaveBeenCalledWith(undefined);
    expect(result.access).toBe("failed");
  });
});
