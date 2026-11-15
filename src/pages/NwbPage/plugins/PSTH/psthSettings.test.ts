// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { encodeStateToString } from "./PSTHItemView/utils/stateEncoding";
import { psthSettings, psthStateFromSettings } from "./psthSettings";

const DEFAULTS = {
  selectedUnitIds: [],
  alignToVariables: ["start_time"],
  groupByVariable: "",
  windowRangeStr: { start: "-0.5", end: "1" },
  prefs: {
    showRaster: true,
    showHist: true,
    smoothedHist: false,
    numBins: 50,
    height: "medium",
  },
};

const params = (stateString: string) =>
  Object.fromEntries(
    psthSettings(stateString)
      .filter((s) => s.value !== s.default)
      .map((s) => [s.key, s.value]),
  );

describe("PSTH settings", () => {
  it("writes nothing for an untouched PSTH", () => {
    expect(params(encodeStateToString(DEFAULTS))).toEqual({});
  });

  it("writes only the changed settings, as plain parameters", () => {
    const state = {
      ...DEFAULTS,
      selectedUnitIds: [0, 1],
      windowRangeStr: { start: "-1", end: "1" },
      prefs: { ...DEFAULTS.prefs, numBins: 80 },
    };
    expect(params(encodeStateToString(state))).toEqual({
      units: "0,1",
      windowStart: "-1",
      numBins: "80",
    });
  });

  it("reads back what it writes", () => {
    const state = {
      ...DEFAULTS,
      selectedUnitIds: [3, 7],
      groupByVariable: "stimulus",
      groupByVariableCategories: undefined,
      sortUnitsByVariable: ["depth", "desc"],
    };
    const link = new URLSearchParams(params(encodeStateToString(state)));
    expect(Object.fromEntries(link)).toEqual({
      units: "3,7",
      groupBy: "stimulus",
      categories: "all",
      sortBy: "depth",
      sortDir: "desc",
    });
    const reopened = psthStateFromSettings(link)!;
    expect(params(reopened)).toEqual(Object.fromEntries(link));
  });

  it("opens with no state when the link has no PSTH settings", () => {
    expect(psthStateFromSettings(new URLSearchParams("url=x"))).toBeUndefined();
  });
});
