import { describe, expect, it } from "vitest";
import { parseMultiTabItem, parseMultiTabItems } from "./multiTabItems";

describe("parseMultiTabItem", () => {
  it("returns a plain path as is", () => {
    expect(parseMultiTabItem("/acquisition/ts")).toEqual({
      path: "/acquisition/ts",
    });
  });

  it("splits a plugin item into name, path, and secondary paths", () => {
    expect(parseMultiTabItem("PSTH|/intervals/trials^/units")).toEqual({
      path: "/intervals/trials",
      pluginName: "PSTH",
      secondaryPaths: ["/units"],
    });
  });

  it("gives an empty secondary list to a plugin item without one", () => {
    expect(parseMultiTabItem("Raster|/units")).toEqual({
      path: "/units",
      pluginName: "Raster",
      secondaryPaths: [],
    });
  });

  it("keeps items aligned with the input", () => {
    const items = parseMultiTabItems(["/a", "PSTH|/b^/units", "/c"]);
    expect(items.map((i) => i.path)).toEqual(["/a", "/b", "/c"]);
    expect(items.map((i) => i.pluginName)).toEqual([
      undefined,
      "PSTH",
      undefined,
    ]);
  });
});
