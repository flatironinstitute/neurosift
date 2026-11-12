import { describe, expect, it } from "vitest";
import { returnPath } from "./returnPath";

describe("returnPath", () => {
  it("keeps a path in the app", () => {
    expect(returnPath("/dandiset/000673?tab=files")).toBe(
      "/dandiset/000673?tab=files",
    );
  });

  it("refuses anything that would leave the site", () => {
    for (const value of [
      null,
      "",
      "https://example.org/",
      "//example.org/",
      "dandiset",
    ])
      expect(returnPath(value)).toBeUndefined();
  });
});
