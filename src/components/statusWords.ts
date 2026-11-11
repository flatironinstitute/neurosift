import type { StatusBarItem } from "./StatusBarContext";

const count = (n: number, one: string, many: string) =>
  `${n.toLocaleString("en-US")} ${n === 1 ? one : many}`;

const READING: Record<string, [string, string]> = {
  group: ["group", "groups"],
  dataset: ["dataset", "datasets"],
  data: ["data block", "data blocks"],
};

/** The status bar’s items in words: what is being read now, then the totals so far. */
export function statusWords(items: Record<string, StatusBarItem>): string[] {
  const all = Object.values(items);
  const reading = Object.keys(READING)
    .map(
      (what) =>
        [
          what,
          all.filter((i) => i.type === "reading" && i.what === what).length,
        ] as const,
    )
    .filter(([, n]) => n > 0)
    .map(([what, n]) => count(n, ...READING[what]));
  const words = reading.length ? [`Reading ${reading.join(" and ")}`] : [];
  for (const item of all)
    if (item.type === "stats")
      words.push(
        `Read ${[
          count(item.groups, "group", "groups"),
          count(item.datasets, "dataset", "datasets"),
          count(item.reads, "data request", "data requests"),
        ].join(" · ")}`,
      );
  return words;
}
