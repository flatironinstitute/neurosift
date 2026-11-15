/** An archive that takes API keys, as people know it and as Settings keeps its key. */
export type Archive = {
  name: "DANDI" | "DANDI sandbox" | "EMBER";
  /** How a sentence starts with it: "The DANDI sandbox didn’t accept …". */
  subject: string;
  /** "a DANDI", "an EMBER": the article that goes before "API key". */
  aKey: string;
  /** Where people get a key: "Get a key on the DANDI sandbox". */
  on: string;
  site: string;
  storageKey: "dandiApiKey" | "dandiStagingApiKey" | "emberApiKey";
  apiPrefix: string;
};

export const ARCHIVES: Archive[] = [
  {
    name: "DANDI sandbox",
    subject: "The DANDI sandbox",
    aKey: "a DANDI sandbox",
    on: "the DANDI sandbox",
    site: "https://gui-staging.dandiarchive.org",
    storageKey: "dandiStagingApiKey",
    apiPrefix: "https://api.sandbox.dandiarchive.org/",
  },
  {
    name: "DANDI",
    subject: "DANDI",
    aKey: "a DANDI",
    on: "DANDI",
    site: "https://dandiarchive.org",
    storageKey: "dandiApiKey",
    apiPrefix: "https://api.dandiarchive.org/",
  },
  {
    name: "EMBER",
    subject: "EMBER",
    aKey: "an EMBER",
    on: "EMBER",
    site: "https://dandi.emberarchive.org",
    storageKey: "emberApiKey",
    apiPrefix: "https://api-dandi.emberarchive.org",
  },
];

export const archiveForUrl = (url?: string) =>
  url ? ARCHIVES.find((a) => url.startsWith(a.apiPrefix)) : undefined;

const savedKey = (archive: Archive) =>
  localStorage.getItem(archive.storageKey) || "";

// Keys an archive answered 401 to on this page load, by archive.
const refusedKeys: Partial<Record<Archive["storageKey"], string>> = {};

const isRefused = (archive: Archive, key: string) =>
  !!key && refusedKeys[archive.storageKey] === key;

/** Whether the archive refused the key saved for this url, so requests now go without it. */
export const keyRefusedFor = (url: string) => {
  const archive = archiveForUrl(url);
  return !!archive && isRefused(archive, savedKey(archive));
};

/** The Authorization header for an archive url: the saved key, unless the archive refused it. */
export const getAuthorizationHeaderForUrl = (url?: string) => {
  const archive = archiveForUrl(url);
  if (!archive) return "";
  const key = savedKey(archive);
  return key && !isRefused(archive, key) ? `token ${key}` : "";
};

// Open, open without the refused key, or blocked: embargoed, maybe embargoed
// (a 404 on DANDI), refused key, or failed for another reason.
export type ApiKeyAccess =
  | "open"
  | "keyRefusedOpen"
  | "embargoed"
  | "notPublic"
  | "keyRefused"
  | "failed";

/** The states a page has to explain. */
export type NoticeAccess = Exclude<ApiKeyAccess, "open" | "failed">;

const answered = (status?: number) =>
  status !== undefined && status >= 200 && status < 400;

/** Decides the access state from the archive, whether a key was saved, its status, and the retry without it. */
export const apiKeyAccess = ({
  archive,
  keySaved,
  status,
  retryStatus,
}: {
  archive: Archive;
  keySaved: boolean;
  status: number;
  retryStatus?: number;
}): ApiKeyAccess => {
  if (keySaved && status === 401)
    return answered(retryStatus) ? "keyRefusedOpen" : "keyRefused";
  if (answered(status)) return "open";
  if (keySaved) return "failed";
  if (status === 401 || status === 403) return "embargoed";
  if (status === 404 && archive.name !== "EMBER") return "notPublic";
  return "failed";
};

type Send = (headers?: { Authorization: string }) => Promise<Response>;

// Sends with the saved key; when the archive refuses it (401), sends again without
// it and remembers the refusal for the rest of the page load.
export const sendWithApiKey = async (url: string, send: Send) => {
  const archive = archiveForUrl(url);
  const key = archive ? savedKey(archive) : "";
  if (!archive || !key) {
    const response = await send(undefined);
    const access: ApiKeyAccess = archive
      ? apiKeyAccess({ archive, keySaved: false, status: response.status })
      : answered(response.status)
        ? "open"
        : "failed";
    return { response, status: response.status, access };
  }
  let status = 401;
  let response: Response | undefined;
  if (!isRefused(archive, key)) {
    response = await send({ Authorization: `token ${key}` });
    status = response.status;
    if (status !== 401)
      return {
        response,
        status,
        access: apiKeyAccess({ archive, keySaved: true, status }),
      };
    refusedKeys[archive.storageKey] = key;
  }
  response = await send(undefined);
  const access = apiKeyAccess({
    archive,
    keySaved: true,
    status,
    retryStatus: response.status,
  });
  return { response, status, access };
};
