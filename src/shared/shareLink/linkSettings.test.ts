import { describe, expect, it } from "vitest";
import {
  changedSettings,
  copiedMessage,
  formatIndices,
  formatNumber,
  formatRun,
  objectPrefixes,
  pageSearch,
  prefixSettings,
  unprefixSettings,
  linkedSettings,
  parseIndices,
  parseNumber,
  parseRun,
  readableParam,
  settingsLink,
  type Setting,
} from "./linkSettings";

const LFP_TAB = "/acquisition/LFPs";
const FILE =
  "https://neurosift.app/nwb?url=https://api.dandiarchive.org/api/assets/abc/download/&dandisetId=000673&dandisetVersion=draft";

const timeseries = (channels: string, separation: string): Setting[] => [
  { key: "channels", value: channels, default: "0-3", label: "channels" },
  { key: "separation", value: separation, default: "0", label: "separation" },
  {
    key: "renderer",
    value: "canvas",
    default: "canvas",
    label: "the renderer",
  },
];

describe("changedSettings", () => {
  it("keeps only the settings that differ from their defaults", () => {
    expect(changedSettings(timeseries("8-15", "0"))).toEqual([
      { key: "channels", value: "8-15", default: "0-3", label: "channels" },
    ]);
  });

  it("keeps none for an untouched view", () => {
    expect(changedSettings(timeseries("0-3", "0"))).toEqual([]);
  });
});

describe("settingsLink", () => {
  it("adds the tab and only the changed settings, readable", () => {
    expect(settingsLink(FILE, { tab: LFP_TAB }, timeseries("8-15", "2"))).toBe(
      `${FILE}&tab=/acquisition/LFPs&channels=8-15&separation=2`,
    );
  });

  it("stays short for an untouched view", () => {
    expect(settingsLink(FILE, { tab: LFP_TAB }, timeseries("0-3", "0"))).toBe(
      `${FILE}&tab=/acquisition/LFPs`,
    );
  });

  it("drops settings and the #hash left in the address by the link that opened it", () => {
    expect(
      settingsLink(
        `${FILE}&tab=/units&channels=8-15&spec={}#units=0,1`,
        { tab: LFP_TAB },
        timeseries("0-3", "1"),
      ),
    ).toBe(`${FILE}&tab=/acquisition/LFPs&separation=1`);
  });

  it("keeps a + in a path escaped, so the link finds the file", () => {
    expect(
      settingsLink(
        "https://neurosift.app/nwb?dandisetId=000673&path=sub-1/a%2Bb.nwb",
        { tab: "view:PSTH|/intervals/trials" },
        [{ key: "units", value: "0,1", default: "", label: "units" }],
      ),
    ).toBe(
      "https://neurosift.app/nwb?dandisetId=000673&path=sub-1/a%2Bb.nwb&tab=view:PSTH|/intervals/trials&units=0,1",
    );
  });

  it("works on a page with only a tab", () => {
    expect(
      settingsLink(
        "https://neurosift.app/openneuro-dataset/ds001",
        { tab: "sub-01/a.edf|abc" },
        [],
      ),
    ).toBe(
      "https://neurosift.app/openneuro-dataset/ds001?tab=sub-01/a.edf|abc",
    );
  });
});

describe("pageSearch", () => {
  it("keeps the page and folder, and drops a tab and its settings", () => {
    expect(
      pageSearch(
        "?dandisetVersion=draft&location=sub-1/ses-1&tab=sub-1/a.nwb|x&channels=8-15",
      ),
    ).toBe("dandisetVersion=draft&location=sub-1%2Fses-1");
  });
});

describe("linkedSettings", () => {
  it("reads the settings when the link names this tab", () => {
    const linked = linkedSettings(
      "?url=x&tab=/acquisition/LFPs&channels=8-15&separation=2",
      LFP_TAB,
    );
    expect(linked.get("channels")).toBe("8-15");
    expect(linked.get("separation")).toBe("2");
  });

  it("reads nothing when the link names another tab", () => {
    expect(
      linkedSettings("?tab=/units&channels=8-15", LFP_TAB).get("channels"),
    ).toBeNull();
  });

  it("round-trips: what a link writes, opening it reads back", () => {
    const settings = timeseries("8-15", "2");
    const link = settingsLink(FILE, { tab: LFP_TAB }, settings);
    const linked = linkedSettings(new URL(link).search, LFP_TAB);
    for (const s of changedSettings(settings))
      expect(linked.get(s.key)).toBe(s.value);
    expect(linked.get("renderer")).toBeNull();
  });
});

describe("copiedMessage", () => {
  it("says only Link copied for an untouched view", () => {
    expect(copiedMessage([])).toBe("Link copied");
  });

  it("names what the link carries, once each", () => {
    expect(
      copiedMessage([
        { key: "start", value: "120", default: "", label: "the time window" },
        { key: "duration", value: "5", default: "", label: "the time window" },
        { key: "channels", value: "8-15", default: "0-3", label: "channels" },
        { key: "separation", value: "2", default: "0", label: "separation" },
      ]),
    ).toBe("Link copied with the time window, channels and separation");
  });
});

describe("numbers and channel lists", () => {
  it("writes numbers short and reads them back", () => {
    expect(formatNumber(120)).toBe("120");
    expect(formatNumber(1.23456789)).toBe("1.234568");
    expect(formatNumber(-0.5)).toBe("-0.5");
    expect(parseNumber("2.5")).toBe(2.5);
    expect(parseNumber("abc")).toBeUndefined();
    expect(parseNumber(null)).toBeUndefined();
  });

  it("writes runs of channels as ranges and reads them back", () => {
    expect(formatIndices([8, 9, 10, 11, 12, 13, 14, 15])).toBe("8-15");
    expect(formatIndices([0, 1, 2, 7, 9, 10])).toBe("0-2,7,9-10");
    expect(formatIndices([3])).toBe("3");
    expect(parseIndices("0-2,7,9-10")).toEqual([0, 1, 2, 7, 9, 10]);
    expect(parseIndices("8-15")).toEqual([8, 9, 10, 11, 12, 13, 14, 15]);
    expect(parseIndices("x")).toBeUndefined();
    expect(parseIndices(null)).toBeUndefined();
  });

  it("writes a window of channels as first-last and reads it back", () => {
    expect(formatRun(8, 8)).toBe("8-15");
    expect(formatRun(3, 1)).toBe("3");
    expect(parseRun("8-15")).toEqual({ first: 8, count: 8 });
    expect(parseRun("3")).toEqual({ first: 3, count: 1 });
    expect(parseRun("")).toBeUndefined();
  });

  it("escapes only what would break a link", () => {
    expect(readableParam("view:PSTH|/intervals/trials")).toBe(
      "view:PSTH|/intervals/trials",
    );
    expect(readableParam("a+b&c#d")).toBe("a%2Bb%26c%23d");
  });
});

describe("combined tabs", () => {
  it("names each object by its last path segment", () => {
    expect(objectPrefixes(["/acquisition/LFPs", "/intervals/trials"])).toEqual([
      "LFPs",
      "trials",
    ]);
  });

  it("uses the shortest unique suffix when last segments clash", () => {
    expect(
      objectPrefixes([
        "/processing/ecephys/LFP",
        "/processing/behavior/LFP",
        "/units",
      ]),
    ).toEqual(["ecephys/LFP", "behavior/LFP", "units"]);
  });

  it("names the same object's second view after the view", () => {
    expect(objectPrefixes(["/units", "/units"], [undefined, "Raster"])).toEqual(
      ["units", "units-raster"],
    );
    expect(objectPrefixes(["/units", "/units"], ["Raster", undefined])).toEqual(
      ["units-raster", "units"],
    );
  });

  it("keeps the plain name for the first when every view is named", () => {
    expect(objectPrefixes(["/units", "/units"], ["Raster", "PSTH"])).toEqual([
      "units",
      "units-psth",
    ]);
  });

  it("tells clashing objects apart by path, and their views by name", () => {
    expect(
      objectPrefixes(
        ["/a/LFP", "/b/LFP", "/b/LFP"],
        [undefined, undefined, "LfpSpectrogram"],
      ),
    ).toEqual(["a/LFP", "b/LFP", "b/LFP-lfpspectrogram"]);
  });

  it("prefixes a view's settings but not the shared time window and speed", () => {
    const prefixed = prefixSettings("LFPs", [
      { key: "channels", value: "8-15", default: "0-3", label: "channels" },
      { key: "speed", value: "2", default: "1", label: "speed" },
    ]);
    expect(prefixed.map((s) => s.key)).toEqual(["LFPs.channels", "speed"]);
  });

  it("reads back each view's settings from a combined link", () => {
    const params = new URLSearchParams(
      "tab=x&LFPs.channels=8-15&trials.alignTo=stop_time&start=10&duration=5",
    );
    expect(Object.fromEntries(unprefixSettings("LFPs", params))).toEqual({
      channels: "8-15",
      start: "10",
      duration: "5",
    });
    expect(Object.fromEntries(unprefixSettings("trials", params))).toEqual({
      alignTo: "stop_time",
      start: "10",
      duration: "5",
    });
  });
});
