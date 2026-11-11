import { describe, expect, it } from "vitest";
import {
  axisOptions,
  axisParam,
  COLOR_BY_VALUES,
  fileSummary,
  numParam,
  panelKey,
  panelLabel,
  sampleIndices,
} from "./viewState";
import type { IcephysRow } from "./useIcephysTable";

const row = (over: Partial<IcephysRow>): IcephysRow =>
  ({
    irtRow: 0,
    seqRow: 0,
    protocolLabel: "ramp",
    custom: {},
    ...over,
  }) as IcephysRow;

describe("sampleIndices", () => {
  it("returns every index when the budget covers them", () => {
    expect(sampleIndices(4, 10)).toEqual([0, 1, 2, 3]);
  });
  it("keeps both ends and nests smaller samples in larger ones", () => {
    const small = sampleIndices(100, 5);
    const large = sampleIndices(100, 20);
    expect(small[0]).toBe(0);
    expect(small).toContain(99);
    expect(small.every((i) => large.includes(i))).toBe(true);
    expect(large).toHaveLength(20);
  });
  it("handles empty and single picks", () => {
    expect(sampleIndices(0, 5)).toEqual([]);
    expect(sampleIndices(9, 1)).toEqual([0]);
  });
});

describe("panelKey and panelLabel", () => {
  const sweep = row({
    condRow: 2,
    repRow: 1,
    electrode: "electrode-0",
    custom: { stim: "a" },
  });
  it("keys and names each axis", () => {
    expect(panelKey(sweep, "condition")).toBe("c2");
    expect(panelLabel(sweep, "condition")).toBe("condition 2");
    expect(panelKey(sweep, "repetition")).toBe("r1");
    expect(panelKey(sweep, "electrode")).toBe("e:electrode-0");
    expect(panelLabel(sweep, "cell")).toBe("(no cell)");
    expect(panelKey(sweep, "col:stim")).toBe("col:stim=a");
    expect(panelLabel(sweep, "protocol")).toBe("ramp");
  });
});

describe("URL seeds", () => {
  it("reads numbers and drops anything else", () => {
    const sp = new URLSearchParams("a=3&b=x");
    expect(numParam(sp, "a")).toBe(3);
    expect(numParam(sp, "b")).toBeUndefined();
    expect(numParam(sp, "c")).toBeUndefined();
  });
  it("accepts known axes and custom columns, else the fallback", () => {
    const sp = new URLSearchParams("c=electrode&d=col:stim&e=bogus");
    expect(axisParam(sp, "c", COLOR_BY_VALUES, "auto")).toBe("electrode");
    expect(axisParam(sp, "d", COLOR_BY_VALUES, "auto")).toBe("col:stim");
    expect(axisParam(sp, "e", COLOR_BY_VALUES, "auto")).toBe("auto");
    expect(axisParam(sp, "f", COLOR_BY_VALUES, "auto")).toBe("auto");
  });
});

describe("axisOptions", () => {
  const varies = {
    protocol: false,
    condition: true,
    repetition: false,
    electrode: true,
    cell: false,
  };
  const custom = [{ name: "stim", axis: "col:stim" }];
  it("lists the first option, then only the axes that vary", () => {
    expect(
      axisOptions({ value: "auto", label: "Auto" }, varies, custom),
    ).toEqual([
      { value: "auto", label: "Auto" },
      { value: "condition", label: "Condition" },
      { value: "electrode", label: "Electrode" },
      { value: "col:stim", label: "stim" },
    ]);
  });
  it("leaves out the axis already used", () => {
    const values = axisOptions(
      { value: "none", label: "None" },
      varies,
      custom,
      "electrode",
    ).map((o) => o.value);
    expect(values).toEqual(["none", "condition", "col:stim"]);
  });
});

describe("fileSummary", () => {
  it("counts sweeps and the tiers present", () => {
    const rows = [
      row({ irtRow: 0, repRow: 0, electrode: "e0" }),
      row({ irtRow: 1, repRow: 1, electrode: "e1" }),
    ];
    expect(fileSummary(rows)).toBe(
      "2 sweeps · 1 protocol · 2 repetitions · 2 electrodes",
    );
    expect(fileSummary([])).toBe("");
  });
});
