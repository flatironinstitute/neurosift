import { PAGE_PARAMS, readableParam } from "@shared/shareLink/linkSettings";
import { legacySpecParam } from "../pages/NwbPage/plugins/LfpSpectrogram/spectrogramSettings";

const V2 = "https://neurosift.app";

// Pages v2 has at the same address; any other opens v2's home.
const SAME_PATHS = [
  "/",
  "/dandi",
  "/ember",
  "/openneuro",
  "/nwb",
  "/edf",
  "/video",
  "/slp",
  "/settings",
  "/guide",
];
const SAME_PREFIXES = ["/dandiset/", "/ember-dandiset/", "/openneuro-dataset/"];

// v2 has a page per archive instead of one search.
const ARCHIVE_PAGES: Record<string, string> = {
  dandi: "/dandi",
  ember: "/ember",
  openneuro: "/openneuro",
};

// The page parameters v2 reads; it has no folder links (location).
const V2_PAGE_PARAMS = [
  ...PAGE_PARAMS.filter((key) => key !== "location"),
  "tab",
];

/** Where a view's settings go in a v2 link, and the name v2 gives each one. */
type V2Settings = { in: "query" | "hash"; names: Record<string, string> };

const VIDEO: V2Settings = {
  in: "query",
  names: { order: "videoOrder", layout: "videoLayout", time: "videoTime" },
};

const ICEPHYS: V2Settings = {
  in: "query",
  names: Object.fromEntries(
    [
      "protocol",
      "condition",
      "repetition",
      "colorBy",
      "panelsBy",
      "andBy",
      "windowStart",
      "windowEnd",
      "lockY",
    ].map((key) => [key, `icephys${key[0].toUpperCase()}${key.slice(1)}`]),
  ),
};

const POSE: V2Settings = {
  in: "query",
  names: {
    hidden: "poseHidden",
    edges: "poseEdges",
    poseOnly: "poseOnly",
    confidence: "poseConf",
    fade: "poseFade",
    trails: "poseTrails",
    trailSeconds: "poseTrailSec",
    video: "poseVideo",
    videoSource: "poseVideoSource",
    time: "poseTime",
  },
};

// v2's PSTH and Event-related signal views kept their settings after #.
const PSTH: V2Settings = {
  in: "hash",
  names: Object.fromEntries(
    [
      "units",
      "alignTo",
      "groupBy",
      "categories",
      "windowStart",
      "windowEnd",
      "sortBy",
      "sortDir",
      "showRaster",
      "showHist",
      "smoothed",
      "numBins",
      "plotHeight",
    ].map((key) => [key, key]),
  ),
};

const EVENT_RELATED_SIGNAL: V2Settings = {
  in: "hash",
  names: {
    series: "ta_series",
    channels: "ta_channels",
    alignTo: "ta_align",
    window: "ta_win",
    maxIntervals: "ta_max",
    groupBy: "ta_groupby",
    groupDisplay: "ta_groupdisp",
  },
};

const VIEWS: Record<string, V2Settings> = {
  PSTH,
  EventRelatedSignal: EVENT_RELATED_SIGNAL,
  PoseEstimation: POSE,
};

/** The v2 settings of the view a tab shows, for those v2 kept in its links. */
const tabSettings = (tab: string | null): V2Settings | undefined => {
  if (tab === "video-widget") return VIDEO;
  if (tab === "icephys") return ICEPHYS;
  // An object in its own tab: of its views, only the pose view read v2 links.
  if (tab?.startsWith("/")) return POSE;
  const view = tab?.match(/^view:([^|]*)\|/)?.[1];
  return view ? VIEWS[view] : undefined;
};

const v2Path = (pathname: string, q: URLSearchParams): string => {
  if (pathname === "/search") {
    const archives = (q.get("archive") ?? "")
      .toLowerCase()
      .split(",")
      .filter(Boolean);
    return (archives.length === 1 && ARCHIVE_PAGES[archives[0]]) || "/";
  }
  if (SAME_PATHS.includes(pathname)) return pathname;
  if (SAME_PREFIXES.some((prefix) => pathname.startsWith(prefix)))
    return pathname;
  return "/";
};

const join = (mark: string, entries: [string, string][]) =>
  entries.length > 0
    ? mark + entries.map(([k, v]) => `${k}=${readableParam(v)}`).join("&")
    : "";

/** The same page in Neurosift v2: its dataset, file and tab, with the view settings v2 can read. */
export function v2Url(pathname: string, search: string): string {
  const q = new URLSearchParams(search);
  const path = v2Path(pathname, q);
  const query: [string, string][] =
    path === "/" ? [] : [...q].filter(([key]) => V2_PAGE_PARAMS.includes(key));
  const hash: [string, string][] = [];
  if (path === "/nwb") {
    const tab = q.get("tab");
    const spectrogram = tab?.match(/^view:LfpSpectrogram\|([^^]*)/)?.[1];
    const spec = spectrogram && legacySpecParam(q, spectrogram);
    if (spec) query.push(["spec", spec]);
    const settings = tabSettings(tab);
    for (const [key, value] of q) {
      const name = settings?.names[key];
      if (name) (settings.in === "query" ? query : hash).push([name, value]);
    }
  }
  return `${V2}${path}${join("?", query)}${join("#", hash)}`;
}
