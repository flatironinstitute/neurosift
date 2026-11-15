import { describe, expect, it } from "vitest";
import { makeDefaultConfig } from "../pages/NwbPage/plugins/LfpSpectrogram/spectralConfig";
import { mapLegacyUrl } from "./legacyUrl";
import { v2Url } from "./v2Url";

const V2 = "https://neurosift.app";
const ASSET =
  "https://api.dandiarchive.org/api/assets/65a7e913-45c7-48db-bf19-b9f5e910110a/download/";
const NWB = `url=${ASSET}&dandisetId=000673&dandisetVersion=0.250122.0110`;

// [v3 address, the v2 link it opens]; the address is pathname + search.
const V3_LINKS: [string, string][] = [
  ["/", "/"],
  ["/search", "/"],
  ["/search?q=mouse", "/"],
  ["/search?q=mouse&archive=DANDI", "/dandi"],
  ["/search?archive=EMBER&sort=newest", "/ember"],
  ["/search?archive=OpenNeuro&mode=semantic", "/openneuro"],
  ["/search?q=mouse&archive=DANDI,EMBER", "/"],
  ["/dandi", "/dandi"],
  ["/dandi?q=mouse&types=Units", "/dandi"],
  ["/ember", "/ember"],
  ["/openneuro?q=fmri", "/openneuro"],
  ["/dandiset/000673", "/dandiset/000673"],
  [
    "/dandiset/000673?dandisetVersion=0.250122.0110",
    "/dandiset/000673?dandisetVersion=0.250122.0110",
  ],
  [
    "/dandiset/000673?tab=sub-1/sub-1_ses-1_ecephys%2Bimage.nwb|e5b5",
    "/dandiset/000673?tab=sub-1/sub-1_ses-1_ecephys%2Bimage.nwb|e5b5",
  ],
  ["/dandiset/000673?location=sub-1", "/dandiset/000673"],
  ["/ember-dandiset/000207?tab=x.nwb", "/ember-dandiset/000207?tab=x.nwb"],
  [
    "/openneuro-dataset/ds000001?tab=participants.tsv",
    "/openneuro-dataset/ds000001?tab=participants.tsv",
  ],
  [`/nwb?${NWB}`, `/nwb?${NWB}`],
  [`/nwb?${NWB}&tab=/units`, `/nwb?${NWB}&tab=/units`],
  [`/nwb?${NWB}&tab=hdf5`, `/nwb?${NWB}&tab=hdf5`],
  [`/nwb?${NWB}&embedded=1`, `/nwb?${NWB}&embedded=1`],
  [`/nwb?${NWB}&lindi=0`, `/nwb?${NWB}&lindi=0`],
  [
    "/nwb?dandisetId=000673&path=sub-1/sub-1.nwb",
    "/nwb?dandisetId=000673&path=sub-1/sub-1.nwb",
  ],
  [
    "/nwb?url=https://example.org/f.nwb%3Fa%3D1%26b%3D2",
    "/nwb?url=https://example.org/f.nwb%3Fa%3D1%26b%3D2",
  ],
  // Settings v2 has no form for are left out.
  [
    `/nwb?${NWB}&tab=/acquisition/LFPs&channels=8-15&separation=2&start=120&duration=5&speed=2`,
    `/nwb?${NWB}&tab=/acquisition/LFPs`,
  ],
  [`/nwb?${NWB}&tab=/units&view=raster`, `/nwb?${NWB}&tab=/units`],
  [
    `/nwb?${NWB}&tab=view:Raster|/units&units=0-9&renderer=plotly`,
    `/nwb?${NWB}&tab=view:Raster|/units`,
  ],
  [
    `/nwb?${NWB}&tab=["/units","Raster|/units"]&units.units=0-3&start=5`,
    `/nwb?${NWB}&tab=[%22/units%22,%22Raster|/units%22]`,
  ],
  // The settings v2 kept, under its names.
  [
    `/nwb?${NWB}&tab=view:PSTH|/intervals/trials^/units&units=0,1&alignTo=start_time,stop_time&smoothed=1`,
    `/nwb?${NWB}&tab=view:PSTH|/intervals/trials^/units#units=0,1&alignTo=start_time,stop_time&smoothed=1`,
  ],
  [
    `/nwb?${NWB}&tab=view:EventRelatedSignal|/intervals/trials^/acquisition/x&series=/acquisition/y&alignTo=stop_time&groupBy=stim`,
    `/nwb?${NWB}&tab=view:EventRelatedSignal|/intervals/trials^/acquisition/x#ta_series=/acquisition/y&ta_align=stop_time&ta_groupby=stim`,
  ],
  [
    `/nwb?${NWB}&tab=icephys&protocol=2&windowStart=10&lockY=1`,
    `/nwb?${NWB}&tab=icephys&icephysProtocol=2&icephysWindowStart=10&icephysLockY=1`,
  ],
  [
    `/nwb?${NWB}&tab=video-widget&order=1,0&layout=grid&time=12.50`,
    `/nwb?${NWB}&tab=video-widget&videoOrder=1,0&videoLayout=grid&videoTime=12.50`,
  ],
  [
    `/nwb?${NWB}&tab=/processing/behavior/pose&hidden=nose,tail&edges=1&time=3.000`,
    `/nwb?${NWB}&tab=/processing/behavior/pose&poseHidden=nose,tail&poseEdges=1&poseTime=3.000`,
  ],
  [
    `/nwb?${NWB}&tab=view:LfpSpectrogram|/acquisition/LFPs&channels=0,3&taper=multitaper&highPassHz=1&start=10&duration=30`,
    `/nwb?${NWB}&tab=view:LfpSpectrogram|/acquisition/LFPs&spec=${encodeURIComponent(
      JSON.stringify({
        "/acquisition/LFPs": {
          config: { taper: "multitaper", highPassHz: 1 },
          channels: [0, 3],
          visRange: [10, 40],
        },
      }),
    ).replace(/%(2F|3A|7C|5B|5D|2C)/g, (e) => decodeURIComponent(e))}`,
  ],
  [
    `/nwb?${NWB}&tab=view:LfpSpectrogram|/acquisition/LFPs`,
    `/nwb?${NWB}&tab=view:LfpSpectrogram|/acquisition/LFPs`,
  ],
  [
    "/edf?url=https://example.org/a.edf&versionId=v1&channels=0-3",
    "/edf?url=https://example.org/a.edf&versionId=v1",
  ],
  [
    "/video?url=https://example.org/a.mp4&dandisetId=000231&dandisetVersion=draft",
    "/video?url=https://example.org/a.mp4&dandisetId=000231&dandisetVersion=draft",
  ],
  ["/slp?url=https://example.org/a.slp", "/slp?url=https://example.org/a.slp"],
  ["/settings", "/settings"],
  ["/guide", "/guide"],
  ["/no-such-page", "/"],
];

// Links in v2's own forms. Opened in v3 (mapLegacyUrl) and sent back, each opens as it was.
const V2_LINKS = [
  `/nwb?${NWB}&tab=view:PSTH|/intervals/trials#units=0,1&alignTo=start_time`,
  `/nwb?${NWB}&tab=view:PSTH|/intervals/trials#units=all&windowStart=-1&numBins=80&plotHeight=large`,
  `/nwb?${NWB}&tab=view:EventRelatedSignal|/intervals/trials^/acquisition/x#ta_series=/acquisition/y&ta_channels=0,2&ta_win=-1,2&ta_max=50&ta_groupby=stim&ta_groupdisp=split`,
  `/nwb?${NWB}&tab=icephys&icephysProtocol=2&icephysColorBy=col:stim&icephysWindowStart=10&icephysLockY=1`,
  `/nwb?${NWB}&tab=video-widget&videoOrder=1,0&videoLayout=grid&videoTime=12.50`,
  `/nwb?${NWB}&tab=view:PoseEstimation|/processing/behavior/pose&poseHidden=nose&poseEdges=1&poseOnly=1&poseConf=0.5&poseTrailSec=2&poseVideo=cam&poseTime=3.000`,
  `/nwb?${NWB}&tab=/processing/behavior/pose&poseFade=1&poseTrails=1&poseVideoSource=65a7e913-45c7-48db-bf19-b9f5e910110a`,
];

const split = (link: string) => {
  const url = new URL(link, V2);
  return [url.pathname, url.search, url.hash] as const;
};

describe("v2Url", () => {
  it.each(V3_LINKS)("opens %s in v2 as %s", (address, expected) => {
    const [pathname, search] = split(address);
    expect(v2Url(pathname, search)).toBe(`${V2}${expected}`);
  });

  it.each(V2_LINKS)("sends %s back to v2 as it was", (link) => {
    const v3 = mapLegacyUrl(...split(link));
    expect(v3).not.toBeNull();
    expect(v3!.hash).toBe("");
    expect(v2Url(v3!.pathname, v3!.search)).toBe(`${V2}${link}`);
  });

  it("gives v2's spectrogram the settings a v2 link gave v3", () => {
    const spec = {
      "/acquisition/LFPs": {
        config: {
          ...makeDefaultConfig(200),
          taper: "multitaper",
          highPassHz: 1,
          baselineWindowSec: [1, 2.5],
          colorLimitLock: true,
        },
        channels: [0, 3, 4, 5],
        visRange: [10, 25],
      },
    };
    const tab = "view:LfpSpectrogram|/acquisition/LFPs";
    const v3 = mapLegacyUrl(
      "/nwb",
      `?${NWB}&tab=${tab}&spec=${encodeURIComponent(JSON.stringify(spec))}`,
      "",
    )!;
    const back = new URL(v2Url(v3.pathname, v3.search));
    expect(back.searchParams.get("tab")).toBe(tab);
    const saved = JSON.parse(back.searchParams.get("spec")!)[
      "/acquisition/LFPs"
    ];
    // v2 lays a link's config over its own defaults.
    expect({ ...makeDefaultConfig(200), ...saved.config }).toEqual(
      spec["/acquisition/LFPs"].config,
    );
    expect(saved.channels).toEqual([0, 3, 4, 5]);
    expect(saved.visRange).toEqual([10, 25]);
  });
});
