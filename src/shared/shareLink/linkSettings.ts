/** One setting of a view: its link parameter, its value now and by default, and how the toast names it. */
export type Setting = {
  key: string;
  value: string;
  default: string;
  label: string;
};

/** The settings that differ from their defaults: all a link carries. */
export const changedSettings = (settings: Setting[]): Setting[] =>
  settings.filter((s) => s.value !== s.default);

/** Parameters that name the page, folder and file; every other one belongs to a view. */
export const PAGE_PARAMS = [
  "url",
  "versionId",
  "dandisetId",
  "dandisetVersion",
  "path",
  "location",
  "lindi",
  "embedded",
];

/** The query string with only the page parameters, without a tab or its settings. */
export const pageSearch = (search: string) => {
  const params = new URLSearchParams(search);
  for (const key of [...params.keys()])
    if (!PAGE_PARAMS.includes(key)) params.delete(key);
  return params.toString();
};

/** Escapes &, #, + and %, and leaves paths, tabs and lists readable. */
export const readableParam = (value: string) =>
  encodeURIComponent(value).replace(/%(2F|3A|7C|5B|5D|2C|40|5E)/g, (escaped) =>
    decodeURIComponent(escaped),
  );

/** A link to this page and tab with the changed settings; nothing else the address holds. */
export const settingsLink = (
  href: string,
  params: Record<string, string>,
  settings: Setting[],
): string => {
  const url = new URL(href);
  const entries: [string, string][] = [];
  for (const key of PAGE_PARAMS) {
    const value = params[key] ?? url.searchParams.get(key);
    if (value !== null) entries.push([key, value]);
  }
  for (const [key, value] of Object.entries(params))
    if (!PAGE_PARAMS.includes(key)) entries.push([key, value]);
  for (const s of changedSettings(settings)) entries.push([s.key, s.value]);
  const query = entries.map(([k, v]) => `${k}=${readableParam(v)}`).join("&");
  return `${url.origin}${url.pathname}${query ? `?${query}` : ""}`;
};

/** The settings in a link that names this tab; none for another tab. */
export const linkedSettings = (search: string, tab: string) => {
  const params = new URLSearchParams(search);
  return params.get("tab") === tab ? params : new URLSearchParams();
};

const joinWords = (words: string[]) =>
  words.length < 2
    ? words.join("")
    : `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}`;

/** “Link copied”, naming what the link carries. */
export const copiedMessage = (settings: Setting[]) => {
  const labels = [...new Set(changedSettings(settings).map((s) => s.label))];
  return labels.length
    ? `Link copied with ${joinWords(labels)}`
    : "Link copied";
};

/** A number written short: at most six decimals, no trailing zeros. */
export const formatNumber = (n: number) => String(Number(n.toFixed(6)) || 0);

export const parseNumber = (value: string | null): number | undefined => {
  if (value === null || value.trim() === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
};

/** Channel or unit indices with runs as ranges: 0-2,7,9-10. */
export const formatIndices = (indices: number[]) => {
  const runs: string[] = [];
  for (let i = 0; i < indices.length; i++) {
    let j = i;
    while (j + 1 < indices.length && indices[j + 1] === indices[j] + 1) j++;
    runs.push(j > i ? `${indices[i]}-${indices[j]}` : String(indices[i]));
    i = j;
  }
  return runs.join(",");
};

const MAX_INDICES = 100_000;

export const parseIndices = (value: string | null): number[] | undefined => {
  if (!value) return undefined;
  const out: number[] = [];
  for (const part of value.split(",")) {
    const match = /^(\d+)(?:-(\d+))?$/.exec(part.trim());
    if (!match) return undefined;
    const first = Number(match[1]);
    const last = match[2] === undefined ? first : Number(match[2]);
    if (last < first || out.length + last - first >= MAX_INDICES)
      return undefined;
    for (let n = first; n <= last; n++) out.push(n);
  }
  return out;
};

/** A window of consecutive channels or units, such as 8-15. */
export const formatRun = (first: number, count: number) =>
  count > 1 ? `${first}-${first + count - 1}` : String(first);

export const parseRun = (value: string | null) => {
  const indices = parseIndices(value);
  if (!indices) return undefined;
  const first = Math.min(...indices);
  return { first, count: Math.max(...indices) - first + 1 };
};

/** Settings every view in a tab shares, so they keep their plain names in a combined tab. */
export const SHARED_SETTINGS = ["start", "duration", "speed"];

/** Each object's name in a combined tab: its last path segment, or the shortest suffix that tells it apart. */
export const objectPrefixes = (
  paths: string[],
  /** The view each item names in the tab, such as Raster; none for the object's default view. */
  views: (string | undefined)[] = [],
): string[] => {
  const parts = paths.map((p) => p.split("/").filter(Boolean));
  const names = parts.map((segments, i) => {
    const others = parts.filter((_, j) => paths[j] !== paths[i]);
    for (let n = 1; n <= segments.length; n++) {
      const suffix = segments.slice(-n).join("/");
      if (!others.some((o) => o.slice(-n).join("/") === suffix)) return suffix;
    }
    return segments.join("/");
  });
  // The same object twice: the default view keeps the name, a named view adds its own.
  const taken = new Set<string>();
  return names.map((name, i) => {
    const plain =
      !views[i] || !paths.some((p, j) => p === paths[i] && !views[j]);
    let prefix =
      plain && !taken.has(name) ? name : `${name}-${views[i]?.toLowerCase()}`;
    for (let n = 2; taken.has(prefix); n++) prefix = `${name}-${n}`;
    taken.add(prefix);
    return prefix;
  });
};

/** A view's settings under its prefix in a combined tab. */
export const prefixSettings = (prefix: string, settings: Setting[]) =>
  settings.map((s) =>
    SHARED_SETTINGS.includes(s.key) ? s : { ...s, key: `${prefix}.${s.key}` },
  );

/** The settings a combined tab's link holds for one view, under their plain names. */
export const unprefixSettings = (prefix: string, params: URLSearchParams) => {
  const out = new URLSearchParams();
  for (const [key, value] of params) {
    if (key.startsWith(`${prefix}.`))
      out.set(key.slice(prefix.length + 1), value);
    else if (SHARED_SETTINGS.includes(key)) out.set(key, value);
  }
  return out;
};
