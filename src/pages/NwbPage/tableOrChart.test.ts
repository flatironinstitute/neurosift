import { describe, expect, it } from "vitest";
import { findTableOrChart, hiddenPlugin, viewToStore } from "./tableOrChart";

describe("findTableOrChart", () => {
  it("pairs a table with the intervals view, Intervals by default in a combined tab", () => {
    const pair = findTableOrChart(
      ["dynamic-table", "TimeIntervals"],
      true,
      undefined,
    );
    expect(pair?.options).toEqual([
      { value: "table", label: "Table" },
      { value: "intervals", label: "Intervals" },
    ]);
    expect(pair?.shown).toBe("intervals");
  });

  it("shows the table by default in the object's own tab", () => {
    const pair = findTableOrChart(
      ["dynamic-table", "TimeIntervals", "default"],
      false,
      undefined,
    );
    expect(pair?.shown).toBe("table");
  });

  it("pairs Units' table with the raster", () => {
    const pair = findTableOrChart(["dynamic-table", "Raster"], false, "raster");
    expect(pair?.options[1]).toEqual({ value: "raster", label: "Raster" });
    expect(pair?.shown).toBe("raster");
  });

  it("follows a stored choice that is one of its options and ignores others", () => {
    expect(
      findTableOrChart(["dynamic-table", "TimeIntervals"], true, "table")
        ?.shown,
    ).toBe("table");
    expect(
      findTableOrChart(["dynamic-table", "TimeIntervals"], true, "raster")
        ?.shown,
    ).toBe("intervals");
  });

  it("offers no switch without both a table and a chart", () => {
    expect(findTableOrChart(["dynamic-table"], true, undefined)).toBe(
      undefined,
    );
    expect(findTableOrChart(["TimeIntervals"], true, undefined)).toBe(
      undefined,
    );
  });
});

describe("hiddenPlugin", () => {
  it("names the plugin the switch hides", () => {
    const pair = findTableOrChart(
      ["dynamic-table", "TimeIntervals"],
      true,
      undefined,
    )!;
    expect(hiddenPlugin(pair)).toBe("dynamic-table");
    expect(hiddenPlugin({ ...pair, shown: "table" })).toBe("TimeIntervals");
  });
});

describe("viewToStore", () => {
  it("stores only a choice that differs from the default", () => {
    const combined = findTableOrChart(
      ["dynamic-table", "TimeIntervals"],
      true,
      undefined,
    )!;
    expect(viewToStore(combined, "table")).toBe("table");
    expect(viewToStore(combined, "intervals")).toBe(undefined);
    const own = findTableOrChart(
      ["dynamic-table", "TimeIntervals"],
      false,
      undefined,
    )!;
    expect(viewToStore(own, "table")).toBe(undefined);
    expect(viewToStore(own, "intervals")).toBe("intervals");
  });
});
