import { describe, expect, it } from "vitest";
import { dandisetChatHref, fileChatHref } from "./chatHref";

const CHAT = "https://dandiset-explorer.neurosift.app/chat";
const DANDI_FILE =
  "https://api.dandiarchive.org/api/assets/65a7e913-45c7-48db-bf19-b9f5e910110a/download/";
const PATH = "sub-1/sub-1_ses-1_ecephys+image.nwb";
const FILE = {
  nwbUrl: DANDI_FILE,
  dandisetId: "000673",
  version: "0.250122.0110",
  assetPath: PATH,
};

describe("dandisetChatHref", () => {
  it("opens the Dandiset explorer chat on a Dandiset and version", () => {
    expect(dandisetChatHref("000673", "draft")).toBe(
      `${CHAT}?dandisetId=000673&dandisetVersion=draft`,
    );
  });

  it("names a file by its encoded path", () => {
    expect(dandisetChatHref("000673", "0.250122.0110", PATH)).toBe(
      `${CHAT}?dandisetId=000673&dandisetVersion=0.250122.0110&assetPath=sub-1%2Fsub-1_ses-1_ecephys%2Bimage.nwb`,
    );
  });
});

describe("fileChatHref", () => {
  it("links a DANDI file with its Dandiset, version and path", () => {
    expect(fileChatHref(FILE)).toBe(
      dandisetChatHref("000673", "0.250122.0110", PATH),
    );
  });

  it.each([
    [
      "an EMBER file",
      {
        nwbUrl:
          "https://api-dandi.emberarchive.org/api/assets/65a7e913-45c7-48db-bf19-b9f5e910110a/download/",
      },
    ],
    [
      "a DANDI sandbox file",
      {
        nwbUrl:
          "https://api.sandbox.dandiarchive.org/api/assets/65a7e913-45c7-48db-bf19-b9f5e910110a/download/",
      },
    ],
    ["a plain URL", { nwbUrl: "https://example.org/data/file.nwb" }],
    ["a file without a Dandiset", { dandisetId: undefined }],
    ["a file without a version", { version: undefined }],
    ["a file whose path isn’t known yet", { assetPath: undefined }],
  ])("is hidden for %s", (_, change) => {
    expect(fileChatHref({ ...FILE, ...change })).toBeUndefined();
  });
});
