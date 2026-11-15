import { readableParam } from "@shared/shareLink/linkSettings";
import { legacySpecSettings } from "../pages/NwbPage/plugins/LfpSpectrogram/spectrogramSettings";

export type AppUrl = { pathname: string; search: string; hash: string };

// v1 view names whose view still exists under another name; any other v1 view opens its object.
const V1_VIEWS: Record<string, string> = {
  "X/Y": "SpatialSeriesXY",
  RasterPlot: "Raster",
  PSTH: "PSTH",
  TrialAlignedSeries: "TrialAlignedSeries",
};

const toSearch = (entries: [string, string | null | undefined][]) => {
  const parts = entries
    .filter((entry): entry is [string, string] => !!entry[1])
    .map(([key, value]) => `${key}=${readableParam(value)}`);
  return parts.length > 0 ? `?${parts.join("&")}` : "";
};

/** A v1 view tab ("view:Name|path^secondary") as a v2 multi-view item, "Name|path^secondary" or the object path. */
const v1ViewItem = (view: string): string => {
  const bar = view.indexOf("|");
  if (bar < 0) return "";
  const plugin = V1_VIEWS[view.slice(0, bar)];
  const target = view.slice(bar + 1);
  return plugin ? `${plugin}|${target}` : target.split("^")[0];
};

const v1Item = (item: string): string =>
  item.startsWith("view:")
    ? v1ViewItem(item.slice("view:".length))
    : item.startsWith("neurodata-item:")
      ? item.slice("neurodata-item:".length).split("|")[0]
      : "";

/** The v2 ?tab= for a v1 one, or undefined for v1's main tab. */
export const mapV1Tab = (tab: string | null): string | undefined => {
  if (!tab || tab === "main") return undefined;
  if (tab.startsWith("neurodata-items:")) {
    const items = tab
      .slice("neurodata-items:".length)
      .split("@")
      .map(v1Item)
      .filter(Boolean);
    return items.length > 0 ? JSON.stringify(items) : undefined;
  }
  if (tab.startsWith("view:")) {
    const item = v1ViewItem(tab.slice("view:".length));
    return item.includes("|") ? `view:${item}` : item || undefined;
  }
  if (tab.startsWith("neurodata-item:")) return v1Item(tab) || undefined;
  return tab;
};

const v1Target = (
  p: string,
  q: URLSearchParams,
): { pathname: string; entries: [string, string | null][] } => {
  const id = (key: string) => q.get(key)?.trim();
  switch (p) {
    case "/dandi":
    case "/ember":
    case "/openneuro":
      return { pathname: p, entries: [] };
    case "/dandiset":
      return id("dandisetId")
        ? {
            pathname: `/dandiset/${id("dandisetId")}`,
            entries: [["dandisetVersion", q.get("dandisetVersion")]],
          }
        : { pathname: "/dandi", entries: [] };
    case "/ember-dandiset":
      return id("emberDandisetId")
        ? {
            pathname: `/ember-dandiset/${id("emberDandisetId")}`,
            entries: [["dandisetVersion", q.get("emberDandisetVersion")]],
          }
        : { pathname: "/ember", entries: [] };
    case "/openneuro-dataset":
      return id("datasetId")
        ? { pathname: `/openneuro-dataset/${id("datasetId")}`, entries: [] }
        : { pathname: "/openneuro", entries: [] };
    case "/edf":
      return {
        pathname: "/edf",
        entries: [
          ["url", q.get("url")],
          ["versionId", q.get("versionId")],
        ],
      };
    case "/avi":
      return {
        pathname: "/video",
        entries: [
          ["url", q.get("url")],
          ["dandisetId", q.get("dandisetId")],
          ["dandisetVersion", q.get("dandisetVersion")],
        ],
      };
    case "/nwb": {
      const assetId = id("dandiAssetId");
      return {
        pathname: "/nwb",
        entries: [
          [
            "url",
            q.get("url") ||
              (assetId
                ? `https://api.dandiarchive.org/api/assets/${assetId}/download/`
                : null),
          ],
          ["dandisetId", q.get("dandisetId")],
          ["dandisetVersion", q.get("dandisetVersion")],
          ["tab", mapV1Tab(q.get("tab")) ?? null],
        ],
      };
    }
    default:
      return { pathname: "/", entries: [] };
  }
};

// Settings the PSTH and Event-related signal views kept after # before they moved to the query.
const HASH_SETTINGS: Record<string, string> = {
  ...Object.fromEntries(
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
  ta_series: "series",
  ta_channels: "channels",
  ta_align: "alignTo",
  ta_win: "window",
  ta_max: "maxIntervals",
  ta_groupby: "groupBy",
  ta_groupdisp: "groupDisplay",
};

// Settings that carried their view's name before links took plain names.
const RENAMED_SETTINGS: Record<string, string> = {
  icephysProtocol: "protocol",
  icephysCondition: "condition",
  icephysRepetition: "repetition",
  icephysColorBy: "colorBy",
  icephysPanelsBy: "panelsBy",
  icephysAndBy: "andBy",
  icephysWindowStart: "windowStart",
  icephysWindowEnd: "windowEnd",
  icephysLockY: "lockY",
  videoOrder: "order",
  videoLayout: "layout",
  videoTime: "time",
  poseTime: "time",
  poseEdges: "edges",
  poseConf: "confidence",
  poseFade: "fade",
  poseTrails: "trails",
  poseTrailSec: "trailSeconds",
  poseHidden: "hidden",
  poseVideo: "video",
  poseVideoSource: "videoSource",
};

const tabPath = (tab: string | null) =>
  tab?.replace(/^view:[^|]*\|/, "").split("^")[0] || undefined;

/** An NWB link with a view's settings in an older form, with them as plain query parameters. */
export function mapLegacySettings(search: string, hash: string): AppUrl | null {
  const entries: [string, string][] = [];
  const keys = new Set<string>();
  let changed = false;
  const q = new URLSearchParams(search);
  for (const [key, value] of q) {
    if (key === "spec") {
      changed = true;
      for (const [k, v] of legacySpecSettings(value, tabPath(q.get("tab"))))
        if (!q.has(k)) entries.push([k, v]);
      continue;
    }
    const name = RENAMED_SETTINGS[key] ?? key;
    changed ||= name !== key;
    if (keys.has(name)) continue;
    keys.add(name);
    entries.push([name, value]);
  }
  const rest = new URLSearchParams(hash.replace(/^#/, ""));
  for (const [key, value] of [...rest]) {
    const name = HASH_SETTINGS[key];
    if (!name) continue;
    changed = true;
    rest.delete(key);
    if (!keys.has(name)) entries.push([name, value]);
    keys.add(name);
  }
  if (!changed) return null;
  return {
    pathname: "/nwb",
    search: toSearch(entries),
    hash: rest.size ? `#${rest}` : "",
  };
}

/** Where a saved link from Neurosift v1 (?p=…) or with older view settings opens now; null for links that already open as they are. */
export function mapLegacyUrl(
  pathname: string,
  search: string,
  hash: string,
): AppUrl | null {
  if (pathname === "/experimental-neurotile")
    return { pathname: "/experimental-neurosift-tiles", search, hash };
  const q = new URLSearchParams(search);
  const p = q.get("p");
  if (p === null)
    return pathname === "/nwb" ? mapLegacySettings(search, hash) : null;
  const target = v1Target(p, q);
  if (q.get("embedded") === "1") target.entries.push(["embedded", "1"]);
  const mapped = {
    pathname: target.pathname,
    search: toSearch(target.entries),
    hash,
  };
  if (mapped.pathname !== "/nwb") return mapped;
  return mapLegacySettings(mapped.search, hash) ?? mapped;
}

/** Rewrites a v1 link in the address bar before the app renders, replacing its history entry. */
export function redirectLegacyUrl(base: string = import.meta.env.BASE_URL) {
  const { pathname, search, hash } = window.location;
  const root = base.replace(/\/$/, "");
  const inApp = pathname.startsWith(root) ? pathname.slice(root.length) : "";
  const mapped = mapLegacyUrl(inApp || "/", search, hash);
  if (!mapped) return;
  window.history.replaceState(
    null,
    "",
    `${root}${mapped.pathname}${mapped.search}${mapped.hash}`,
  );
}
