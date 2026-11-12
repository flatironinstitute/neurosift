// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { spectrogramFromSettings } from "../pages/NwbPage/plugins/LfpSpectrogram/spectrogramSettings";
import { makeDefaultConfig } from "../pages/NwbPage/plugins/LfpSpectrogram/spectralConfig";
import { mapLegacyUrl, mapV1Tab, redirectLegacyUrl } from "./legacyUrl";

const ASSET =
  "https://api.dandiarchive.org/api/assets/65a7e913-45c7-48db-bf19-b9f5e910110a/download/";
const NWB = `url=${ASSET}&dandisetId=000673&dandisetVersion=0.250122.0110`;

// [saved link, what it opens now]; the link is pathname + search (+ hash).
const V1_LINKS: [string, string][] = [
  ["/?p=/", "/"],
  ["/?p=", "/"],
  ["/?p=/dandi", "/dandi"],
  ["/?p=/dandi&staging=1", "/dandi"],
  ["/?p=/dandiset&dandisetId=000673", "/dandiset/000673"],
  [
    "/?p=/dandiset&dandisetId=000673&dandisetVersion=0.250122.0110",
    "/dandiset/000673?dandisetVersion=0.250122.0110",
  ],
  ["/?p=/dandiset", "/dandi"],
  ["/?p=/ember", "/ember"],
  ["/?p=/ember-dandiset&emberDandisetId=000207", "/ember-dandiset/000207"],
  [
    "/?p=/ember-dandiset&emberDandisetId=000207&emberDandisetVersion=draft",
    "/ember-dandiset/000207?dandisetVersion=draft",
  ],
  ["/?p=/ember-dandiset", "/ember"],
  ["/?p=/openneuro", "/openneuro"],
  [
    "/?p=/openneuro-dataset&datasetId=ds000001&datasetVersion=1.0.0",
    "/openneuro-dataset/ds000001",
  ],
  ["/?p=/openneuro-dataset", "/openneuro"],
  [
    "/?p=/edf&url=https://example.org/a.edf&versionId=v1",
    "/edf?url=https://example.org/a.edf&versionId=v1",
  ],
  ["/?p=/edf", "/edf"],
  [
    "/?p=/avi&url=https://example.org/a.avi&dandisetId=000231&dandisetVersion=draft",
    "/video?url=https://example.org/a.avi&dandisetId=000231&dandisetVersion=draft",
  ],
  [`/?p=/nwb&${NWB}`, `/nwb?${NWB}`],
  [
    `/?p=/nwb&dandisetId=000673&dandisetVersion=0.250122.0110&url=${ASSET}`,
    `/nwb?${NWB}`,
  ],
  [
    "/?p=/nwb&dandisetId=000673&dandiAssetId=65a7e913-45c7-48db-bf19-b9f5e910110a",
    `/nwb?url=${ASSET}&dandisetId=000673`,
  ],
  [`/?p=/nwb&${NWB}&tab=main`, `/nwb?${NWB}`],
  [`/?p=/nwb&${NWB}&tab=neurodata-item:/units|Units`, `/nwb?${NWB}&tab=/units`],
  [
    `/?p=/nwb&${NWB}&tab=view:PSTH|/intervals/trials`,
    `/nwb?${NWB}&tab=view:PSTH|/intervals/trials`,
  ],
  [
    `/?p=/nwb&${NWB}&tab=view:X/Y|/acquisition/EyeTracking/pupil_tracking`,
    `/nwb?${NWB}&tab=view:SpatialSeriesXY|/acquisition/EyeTracking/pupil_tracking`,
  ],
  [
    `/?p=/nwb&${NWB}&tab=view:RasterPlot|/units`,
    `/nwb?${NWB}&tab=view:Raster|/units`,
  ],
  [
    `/?p=/nwb&${NWB}&tab=view:TrialAlignedSeries|/intervals/trials^/processing/ophys/Fluorescence/RoiResponseSeries`,
    `/nwb?${NWB}&tab=view:TrialAlignedSeries|/intervals/trials^/processing/ophys/Fluorescence/RoiResponseSeries`,
  ],
  [
    `/?p=/nwb&${NWB}&tab=view:AverageWaveforms|/units`,
    `/nwb?${NWB}&tab=/units`,
  ],
  [
    `/?p=/nwb&${NWB}&tab=view:TimeSeries|/acquisition/LFPs^/units`,
    `/nwb?${NWB}&tab=/acquisition/LFPs`,
  ],
  [`/?p=/nwb&${NWB}&tab=view:PSTH`, `/nwb?${NWB}`],
  [
    `/?p=/nwb&${NWB}&tab=neurodata-items:neurodata-item:/units|Units@view:RasterPlot|/units@view:X/Y|/acquisition/Position`,
    `/nwb?${NWB}&tab=["/units","Raster|/units","SpatialSeriesXY|/acquisition/Position"]`.replace(
      /"/g,
      "%22",
    ),
  ],
  [`/?p=/nwb&${NWB}&tab=neurodata-items:view:PSTH`, `/nwb?${NWB}`],
  [
    `/?p=/nwb&${NWB}&tab=timeseries-alignment`,
    `/nwb?${NWB}&tab=timeseries-alignment`,
  ],
  [`/?p=/nwb&${NWB}&embedded=1`, `/nwb?${NWB}&embedded=1`],
  ["/?p=/dandi&embedded=1", "/dandi?embedded=1"],
  ["/?p=/dandi&embedded=0", "/dandi"],
  [
    `/?p=/nwb&url=${encodeURIComponent("https://example.org/f.nwb?a=1&b=2")}`,
    "/nwb?url=https://example.org/f.nwb%3Fa%3D1%26b%3D2",
  ],
  ["/?p=/nwb", "/nwb"],
  ["/?p=/about", "/"],
  ["/?p=/browse", "/"],
  ["/?p=/chat&chatId=abc", "/"],
  ["/?p=/saved-chats", "/"],
  ["/?p=/annotations", "/"],
  ["/?p=/dandi-query", "/"],
  ["/?p=/plugin&plugin=x", "/"],
  ["/?p=/compute", "/"],
  ["/?p=/import", "/"],
  ["/?p=/tests", "/"],
  ["/experimental-neurotile", "/experimental-neurosift-tiles"],
];

// [saved link, what it opens now] for views' settings in their older forms.
const PSTH_TAB = "tab=view:PSTH|/intervals/trials";
const ERS_TAB = "tab=view:EventRelatedSignal|/intervals/trials^/acquisition/x";
const SETTINGS_LINKS: [string, string][] = [
  [
    `/nwb?${NWB}&${PSTH_TAB}#units=0,1&alignTo=start_time`,
    `/nwb?${NWB}&${PSTH_TAB}&units=0,1&alignTo=start_time`,
  ],
  [
    `/nwb?${NWB}&${PSTH_TAB}#units=all&windowStart=-1&numBins=80&other=1`,
    `/nwb?${NWB}&${PSTH_TAB}&units=all&windowStart=-1&numBins=80#other=1`,
  ],
  [
    `/nwb?${NWB}&${PSTH_TAB}&units=2#units=0,1`,
    `/nwb?${NWB}&${PSTH_TAB}&units=2`,
  ],
  [
    `/nwb?${NWB}&${ERS_TAB}#ta_series=/acquisition/y&ta_channels=0,2&ta_win=-1,2&ta_max=50&ta_groupby=stim&ta_groupdisp=split`,
    `/nwb?${NWB}&${ERS_TAB}&series=/acquisition/y&channels=0,2&window=-1,2&maxIntervals=50&groupBy=stim&groupDisplay=split`,
  ],
  [
    `/nwb?${NWB}&tab=icephys&icephysProtocol=2&icephysColorBy=col:stim&icephysWindowStart=10&icephysLockY=1`,
    `/nwb?${NWB}&tab=icephys&protocol=2&colorBy=col:stim&windowStart=10&lockY=1`,
  ],
  [
    `/nwb?${NWB}&tab=video-widget&videoOrder=1,0&videoLayout=grid&videoTime=12.50`,
    `/nwb?${NWB}&tab=video-widget&order=1,0&layout=grid&time=12.50`,
  ],
  [
    `/nwb?${NWB}&tab=view:PoseEstimation|/processing/behavior/pose&poseHidden=nose&poseEdges=1&poseOnly=1&poseConf=0.5&poseTrailSec=2&poseVideo=cam&poseTime=3.000`,
    `/nwb?${NWB}&tab=view:PoseEstimation|/processing/behavior/pose&hidden=nose&edges=1&poseOnly=1&confidence=0.5&trailSeconds=2&video=cam&time=3.000`,
  ],
];

// Links that already open the same thing, left as they are.
const CURRENT_LINKS = [
  "/",
  "/search?q=mouse&archive=DANDI,EMBER",
  "/dandi",
  "/ember",
  "/openneuro",
  "/dandiset/000673",
  "/dandiset/000673?dandisetVersion=0.250122.0110",
  "/dandiset/000673?tab=sub-1/sub-1_ses-1_ecephys+image.nwb|e5b5",
  "/ember-dandiset/000207?tab=x.nwb",
  "/openneuro-dataset/ds000001?tab=participants.tsv",
  `/nwb?${NWB}`,
  `/nwb?${NWB}&tab=/units`,
  `/nwb?${NWB}&tab=view:PSTH|/intervals/trials`,
  `/nwb?${NWB}&tab=view:TimeAlignedSeries|/intervals/trials`,
  `/nwb?${NWB}&tab=["/units","Raster|/units"]`,
  `/nwb?${NWB}&tab=hdf5`,
  `/nwb?${NWB}&tab=/acquisition/LFPs&channels=8-15&separation=2&start=120&duration=5`,
  `/nwb?${NWB}&tab=view:PSTH|/intervals/trials&units=0,1&windowStart=-1`,
  `/nwb?${NWB}&embedded=1`,
  "/nwb?dandisetId=000673&path=sub-1/sub-1.nwb",
  "/edf?url=https://example.org/a.edf",
  "/video?url=https://example.org/a.mp4",
  "/slp?url=https://example.org/a.slp",
  "/settings",
  "/guide",
  "/no-such-page",
];

const split = (link: string) => {
  const url = new URL(link, "https://neurosift.app");
  return [url.pathname, url.search, url.hash] as const;
};

describe("mapLegacyUrl", () => {
  it.each(V1_LINKS)("opens %s as %s", (link, expected) => {
    const mapped = mapLegacyUrl(...split(link));
    expect(mapped).not.toBeNull();
    expect(`${mapped!.pathname}${mapped!.search}${mapped!.hash}`).toBe(
      expected,
    );
  });

  it.each(CURRENT_LINKS)("leaves %s as it is", (link) => {
    expect(mapLegacyUrl(...split(link))).toBeNull();
  });

  it("moves a v1 link's view settings from the hash to the query", () => {
    expect(
      mapLegacyUrl(
        "/",
        "?p=/nwb&url=x&tab=view:PSTH|/intervals/trials",
        "#units=0",
      ),
    ).toEqual({
      pathname: "/nwb",
      search: "?url=x&tab=view:PSTH|/intervals/trials&units=0",
      hash: "",
    });
  });

  it.each(SETTINGS_LINKS)("opens %s as %s", (link, expected) => {
    const mapped = mapLegacyUrl(...split(link));
    expect(mapped).not.toBeNull();
    expect(`${mapped!.pathname}${mapped!.search}${mapped!.hash}`).toBe(
      expected,
    );
  });

  it("reads an old spectrogram link's changed settings as plain parameters", () => {
    const spec = {
      "/acquisition/LFPs": {
        config: {
          ...makeDefaultConfig(200),
          taper: "multitaper",
          highPassHz: 1,
        },
        channels: [0, 3],
        visRange: [10, 40],
      },
    };
    const tab = "view:LfpSpectrogram|/acquisition/LFPs";
    const mapped = mapLegacyUrl(
      "/nwb",
      `?${NWB}&tab=${tab}&spec=${encodeURIComponent(JSON.stringify(spec))}`,
      "",
    )!;
    expect(mapped.search).toBe(
      `?${NWB}&tab=${tab}&channels=0,3&taper=multitaper&highPassHz=1&fMaxHz=200&start=10&duration=30`,
    );
    const params = new URLSearchParams(mapped.search);
    const { config, channels } = spectrogramFromSettings(
      params,
      makeDefaultConfig(200),
    );
    expect(channels).toEqual([0, 3]);
    expect(config).toEqual({
      ...makeDefaultConfig(200),
      taper: "multitaper",
      highPassHz: 1,
    });
  });

  it("opens an address the NWB page reads back exactly", () => {
    const tab =
      "neurodata-items:view:RasterPlot|/units@neurodata-item:/acquisition/LFPs|ElectricalSeries";
    const mapped = mapLegacyUrl(
      "/",
      `?p=/nwb&url=${ASSET}&tab=${encodeURIComponent(tab)}`,
      "",
    )!;
    const params = new URLSearchParams(mapped.search);
    expect(params.get("url")).toBe(ASSET);
    expect(JSON.parse(params.get("tab")!)).toEqual([
      "Raster|/units",
      "/acquisition/LFPs",
    ]);
  });
});

describe("mapV1Tab", () => {
  it("drops v1's main tab and keeps forms v2 shares", () => {
    expect(mapV1Tab(null)).toBeUndefined();
    expect(mapV1Tab("main")).toBeUndefined();
    expect(mapV1Tab("/units")).toBe("/units");
    expect(mapV1Tab("hdf5")).toBe("hdf5");
  });
});

describe("redirectLegacyUrl", () => {
  const start = window.location.href;
  afterEach(() => window.history.replaceState(null, "", start));

  it("rewrites a v1 link under the deployment's base path", () => {
    window.history.replaceState(
      null,
      "",
      "/pr-7/?p=/dandiset&dandisetId=000673",
    );
    redirectLegacyUrl("/pr-7/");
    expect(window.location.pathname + window.location.search).toBe(
      "/pr-7/dandiset/000673",
    );
  });

  it("rewrites a v1 link at the root", () => {
    window.history.replaceState(null, "", "/?p=/dandi&embedded=1");
    redirectLegacyUrl("/");
    expect(window.location.pathname + window.location.search).toBe(
      "/dandi?embedded=1",
    );
  });

  it("leaves a current link and its history entry alone", () => {
    window.history.replaceState(null, "", "/dandiset/000673?tab=a.nwb");
    const length = window.history.length;
    redirectLegacyUrl("/");
    expect(window.location.pathname + window.location.search).toBe(
      "/dandiset/000673?tab=a.nwb",
    );
    expect(window.history.length).toBe(length);
  });
});
