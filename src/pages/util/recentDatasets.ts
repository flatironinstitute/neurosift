import type { Archive } from "../SearchPage/catalogFeed";

export type RecentDataset = { archive: Archive; id: string; at: number };

const KEY = "neurosift-recent-datasets";
const MAX = 20;
// Lists kept before the combined one, newest first, without times.
const LEGACY: [string, Archive][] = [
  ["recentDandisets", "DANDI"],
  ["recentEmberDandisets", "EMBER"],
  ["recentOpenNeuroDatasets", "OpenNeuro"],
];

const read = <T>(key: string, fallback: T): T => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? (JSON.parse(stored) as T) : fallback;
  } catch {
    return fallback;
  }
};

/** Datasets opened in this browser, newest first, from any archive. */
export function getRecentDatasets(limit = MAX): RecentDataset[] {
  const recent = read<RecentDataset[]>(KEY, []);
  const seen = new Set(recent.map((r) => `${r.archive}:${r.id}`));
  const legacy = LEGACY.flatMap(([key, archive]) =>
    read<string[]>(key, [])
      .filter((id) => !seen.has(`${archive}:${id}`))
      .map((id) => ({ archive, id, at: 0 })),
  );
  return [...recent, ...legacy].slice(0, limit);
}

export function addRecentDataset(archive: Archive, id: string) {
  const rest = read<RecentDataset[]>(KEY, []).filter(
    (r) => !(r.archive === archive && r.id === id),
  );
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify([{ archive, id, at: Date.now() }, ...rest].slice(0, MAX)),
    );
  } catch {
    // Storage can be full or blocked; the list is a convenience.
  }
}
