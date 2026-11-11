import { describe, expect, it } from "vitest";
import { assetIdOf, fileCrumbs } from "./fileCrumbs";

const URL =
  "https://api.dandiarchive.org/api/assets/65a7e913-45c7-48db-bf19-b9f5e910110a/download/";

describe("fileCrumbs", () => {
  it("leads from the archive, through the Dandiset and its folders, to the file", () => {
    expect(
      fileCrumbs({
        base: "/",
        archive: "DANDI",
        dandisetId: "000673",
        assetPath: "sub-1/sub-1_ses-1_ecephys+image.nwb",
        nwbUrl: URL,
      }),
    ).toEqual([
      { label: "DANDI", href: "/dandi" },
      { label: "Dandiset 000673", href: "/dandiset/000673" },
      { label: "sub-1", code: true },
      { label: "sub-1_ses-1_ecephys+image.nwb", code: true },
    ]);
  });

  it("links EMBER files to EMBER’s pages", () => {
    expect(
      fileCrumbs({
        base: "/",
        archive: "EMBER",
        dandisetId: "000200",
        nwbUrl: URL,
      })[1].href,
    ).toBe("/ember-dandiset/000200");
  });

  it("names a file by its address when it isn’t in an archive", () => {
    expect(
      fileCrumbs({ base: "/", nwbUrl: "https://example.org/data/session.nwb" }),
    ).toEqual([{ label: "session.nwb", code: true }]);
  });
});

describe("assetIdOf", () => {
  it("reads the asset id from a download address", () => {
    expect(assetIdOf(URL)).toBe("65a7e913-45c7-48db-bf19-b9f5e910110a");
    expect(assetIdOf("https://example.org/f.nwb")).toBeUndefined();
  });
});
