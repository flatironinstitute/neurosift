import { describe, expect, it } from "vitest";
import { dandiOrdering } from "./archiveSources";

describe("dandiOrdering", () => {
  it("asks DANDI for the newest Dandisets by ID", () => {
    expect(dandiOrdering("newest")).toBe("-id");
  });

  it("keeps recently modified and best match on -modified", () => {
    expect(dandiOrdering("modified")).toBe("-modified");
    expect(dandiOrdering("best")).toBe("-modified");
  });
});
