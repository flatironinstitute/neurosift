import { describe, expect, it } from "vitest";
import { v1Url } from "./v1Url";

describe("v1Url", () => {
  it("opens the same Dandiset, search or file in Neurosift v1", () => {
    expect(v1Url("/dandi", "")).toBe("https://v1.neurosift.app?p=/dandi");
    expect(v1Url("/dandiset/000673", "")).toBe(
      "https://v1.neurosift.app?p=/dandiset&dandisetId=000673",
    );
    expect(v1Url("/nwb", "?url=x&dandisetId=000673")).toBe(
      "https://v1.neurosift.app?p=/nwb&url=x&dandisetId=000673",
    );
  });

  it("opens v1’s home for pages v1 doesn’t have", () => {
    expect(v1Url("/settings", "")).toBe("https://v1.neurosift.app");
  });
});
