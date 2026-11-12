import {
  formatIndices,
  formatNumber,
  parseIndices,
  parseNumber,
  type Setting,
} from "@shared/shareLink/linkSettings";
import { colormapNames } from "./colormap";
import { makeDefaultConfig, SpectralConfig } from "./spectralConfig";

type Value = SpectralConfig[keyof SpectralConfig];

// Fields that hold a word: only these words are read back from a link.
const WORDS: Partial<Record<keyof SpectralConfig, readonly string[]>> = {
  taper: ["boxcar", "hann", "multitaper", "morlet"],
  detrend: ["none", "constant", "linear"],
  normalization: ["none", "whiten", "zscore", "baseline"],
  colorLimitMode: ["auto", "manual"],
  colormap: colormapNames,
  channelMode: ["mean", "perChannel"],
};
const PAIRS: (keyof SpectralConfig)[] = ["baselineWindowSec"];

const encode = (value: Value): string => {
  if (value === null) return "none";
  if (Array.isArray(value)) return value.map(formatNumber).join(",");
  if (typeof value === "number") return formatNumber(value);
  return String(value);
};

const decode = (
  key: keyof SpectralConfig,
  raw: string,
  fallback: Value,
): Value | undefined => {
  if (raw === "none" && !WORDS[key]) return null;
  if (WORDS[key]) return WORDS[key]!.includes(raw) ? (raw as Value) : undefined;
  if (typeof fallback === "boolean")
    return raw === "true" ? true : raw === "false" ? false : undefined;
  if (PAIRS.includes(key)) {
    const pair = raw.split(",").map((part) => parseNumber(part));
    return pair.length === 2 && pair.every((n) => n !== undefined)
      ? (pair as [number, number])
      : undefined;
  }
  return parseNumber(raw);
};

/** The spectrogram's changed settings for a link: channels, then each changed config field by name. */
export const spectrogramSettings = (
  config: SpectralConfig,
  defaults: SpectralConfig,
  channels: number[],
): Setting[] => [
  {
    key: "channels",
    value: formatIndices(channels),
    default: "0",
    label: "channels",
  },
  ...(Object.keys(defaults) as (keyof SpectralConfig)[]).map((key) => ({
    key,
    value: encode(config[key]),
    default: encode(defaults[key]),
    label: "the spectrogram settings",
  })),
];

/** The config and channels a link sets, over the defaults. */
export const spectrogramFromSettings = (
  params: URLSearchParams,
  defaults: SpectralConfig,
): { config: SpectralConfig; channels: number[] } => {
  const config = { ...defaults };
  for (const key of Object.keys(defaults) as (keyof SpectralConfig)[]) {
    const raw = params.get(key);
    const value = raw === null ? undefined : decode(key, raw, defaults[key]);
    if (value !== undefined) (config as Record<string, Value>)[key] = value;
  }
  const channels = parseIndices(params.get("channels"));
  return { config, channels: channels?.length ? channels : [0] };
};

type LegacySpec = {
  config?: Partial<SpectralConfig>;
  channels?: number[];
  visRange?: [number, number];
};

/** An old spec={…} link's view as plain parameters, for the path it saved. */
export const legacySpecSettings = (
  specJson: string,
  path: string | undefined,
): [string, string][] => {
  let map: Record<string, LegacySpec>;
  try {
    map = JSON.parse(specJson);
  } catch {
    return [];
  }
  if (!map || typeof map !== "object") return [];
  const spec = (path && map[path]) || Object.values(map)[0];
  if (!spec || typeof spec !== "object") return [];
  // The real Nyquist isn't known here, so a saved fMaxHz is always kept.
  const defaults = makeDefaultConfig(NaN);
  const out: [string, string][] = [];
  if (Array.isArray(spec.channels) && spec.channels.length)
    out.push(["channels", formatIndices(spec.channels)]);
  for (const key of Object.keys(defaults) as (keyof SpectralConfig)[]) {
    const value = spec.config?.[key];
    if (value === undefined) continue;
    if (encode(value) !== encode(defaults[key])) out.push([key, encode(value)]);
  }
  const range = spec.visRange;
  if (Array.isArray(range) && range.length === 2 && range[1] > range[0])
    out.push(
      ["start", formatNumber(range[0])],
      ["duration", formatNumber(range[1] - range[0])],
    );
  return out.filter(([key, value]) => key !== "channels" || value !== "0");
};
